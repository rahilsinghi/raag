"""Ingestion pipeline: orchestrates lyrics fetching, audio matching, and DB writes."""

import asyncio
import logging
import re
import time
import uuid
from difflib import SequenceMatcher
from hashlib import md5

from sqlalchemy import select

from app.db.postgres import (
    Album,
    Artist,
    Bar,
    EntityMention,
    FeatureArtist,
    Lyrics,
    Song,
    async_session,
)
from app.db.qdrant import QdrantManager
from app.ingestion.audio_manager import AudioManager
from app.ingestion.genius import GeniusClient
from app.ml.audio.clap_encoder import CLAPEncoder
from app.ml.audio.librosa_features import LibrosaFeatureExtractor
from app.ml.lyrics.chunker import LyricsChunker
from app.ml.lyrics.embedder import LyricsEmbedder
from app.ml.nlp.bar_annotator import BarAnnotator
from app.ml.nlp.entity_extractor import EntityExtractor
from app.ml.nlp.topic_classifier import TopicClassifier

logger = logging.getLogger(__name__)


class IngestionPipeline:
    """Orchestrates the full album ingestion flow."""

    def __init__(self) -> None:
        self.genius = GeniusClient()
        self.audio = AudioManager()

    async def ingest_album(
        self,
        artist_name: str,
        artist_slug: str,
        album_name: str,
        album_slug: str,
        release_year: int | None = None,
    ) -> dict:
        """Run the full ingestion pipeline for one album.

        Steps:
            1. Create or fetch the Artist record.
            2. Create or fetch the Album record.
            3. Fetch lyrics from Genius.
            4. Discover local audio files.
            5. Fuzzy-match audio tracks to Genius songs.
            6. Process each matched song (DB writes, placeholders for ML).

        Returns:
            Summary dict with counts of created records.
        """
        logger.info("Starting ingestion: %s - %s", artist_name, album_name)

        async with async_session() as session:
            async with session.begin():
                artist = await self._create_artist(session, artist_name, artist_slug)
                album = await self._create_album(
                    session, artist.id, album_name, album_slug, release_year
                )

        # Fetch lyrics from Genius
        songs_data = self.genius.fetch_album_songs(artist_name, album_name)

        # Discover local audio files
        tracks = self.audio.get_album_tracks(artist_slug, album_slug)

        # Match audio to songs
        matched = self._match_audio_to_songs(tracks, songs_data)

        # Process each matched pair
        created_count = 0
        for song_data, audio_info in matched:
            audio_path = audio_info["path"] if audio_info else None
            track_number = audio_info["track_number"] if audio_info else None

            async with async_session() as session:
                async with session.begin():
                    song = await self._process_song(
                        session, album.id, song_data, audio_path, track_number
                    )
                    created_count += 1

            # Placeholder sub-pipelines (run outside the DB transaction)
            if audio_path:
                await self._process_audio(song.id, audio_path)
            if song_data.get("lyrics"):
                await self._process_lyrics(
                    song.id, song_data["lyrics"], song_data.get("sections", [])
                )
            await self._process_nlp(song.id)

        summary = {
            "artist": artist_name,
            "album": album_name,
            "songs_from_genius": len(songs_data),
            "audio_tracks_found": len(tracks),
            "songs_created": created_count,
        }
        logger.info("Ingestion complete: %s", summary)
        return summary

    async def _create_artist(
        self, session, name: str, slug: str
    ) -> Artist:
        """Get existing artist by slug or create a new one."""
        result = await session.execute(select(Artist).where(Artist.slug == slug))
        artist = result.scalar_one_or_none()
        if artist is not None:
            logger.info("Artist already exists: %s (id=%s)", name, artist.id)
            return artist

        artist = Artist(name=name, slug=slug)
        session.add(artist)
        await session.flush()
        logger.info("Created artist: %s (id=%s)", name, artist.id)
        return artist

    async def _create_album(
        self,
        session,
        artist_id: uuid.UUID,
        title: str,
        slug: str,
        release_year: int | None,
    ) -> Album:
        """Get existing album by slug + artist or create a new one."""
        result = await session.execute(
            select(Album).where(Album.artist_id == artist_id, Album.slug == slug)
        )
        album = result.scalar_one_or_none()
        if album is not None:
            logger.info("Album already exists: %s (id=%s)", title, album.id)
            return album

        album = Album(
            artist_id=artist_id,
            title=title,
            slug=slug,
            release_year=release_year,
        )
        session.add(album)
        await session.flush()
        logger.info("Created album: %s (id=%s)", title, album.id)
        return album

    def _match_audio_to_songs(
        self,
        tracks: list[dict],
        songs: list[dict],
    ) -> list[tuple[dict, dict | None]]:
        """Fuzzy-match audio file titles to Genius song titles.

        Uses difflib.SequenceMatcher for flexible string comparison.
        Each song gets at most one audio track; unmatched songs get None.

        Returns:
            List of (song_data, audio_info_or_None) tuples.
        """
        available_tracks = list(tracks)  # copy so we can remove matches
        matched: list[tuple[dict, dict | None]] = []

        for song in songs:
            song_title = song["title"].lower().strip()
            best_match: dict | None = None
            best_ratio: float = 0.0

            for track in available_tracks:
                track_title = track["title"].lower().strip()
                ratio = SequenceMatcher(None, song_title, track_title).ratio()
                if ratio > best_ratio:
                    best_ratio = ratio
                    best_match = track

            if best_match is not None and best_ratio >= 0.6:
                logger.debug(
                    "Matched '%s' -> '%s' (%.2f)",
                    song["title"],
                    best_match["title"],
                    best_ratio,
                )
                available_tracks.remove(best_match)
                matched.append((song, best_match))
            else:
                logger.warning("No audio match for song: %s", song["title"])
                matched.append((song, None))

        return matched

    async def _process_song(
        self,
        session,
        album_id: uuid.UUID,
        song_data: dict,
        audio_path: str | None,
        track_number: int | None,
    ) -> Song:
        """Create a Song record in the database."""
        song = Song(
            album_id=album_id,
            title=song_data["title"],
            track_number=track_number,
            genius_id=song_data.get("genius_id"),
            genius_url=song_data.get("genius_url"),
            audio_path=audio_path,
        )
        session.add(song)
        await session.flush()
        logger.info("Created song: %s (id=%s)", song.title, song.id)
        return song

    async def _process_audio(self, song_id: uuid.UUID, audio_path: str) -> None:
        """Extract librosa features and CLAP embeddings from audio."""
        logger.info("Processing audio for song_id=%s, path=%s", song_id, audio_path)
        try:
            extractor = LibrosaFeatureExtractor()
            features = extractor.extract_features(audio_path)

            async with async_session() as session:
                async with session.begin():
                    result = await session.execute(select(Song).where(Song.id == song_id))
                    song = result.scalar_one()
                    song.duration_seconds = features["duration_seconds"]
                    song.tempo_bpm = features["tempo"]
                    song.key = features["key"]
                    song.energy = features["energy"]
                    song.spectral_centroid = features["spectral_centroid"]
                    song.onset_density = features["onset_density"]
                    song.mood_energy = features["mood_energy"]

            encoder = CLAPEncoder()
            embedding = encoder.encode_audio(audio_path)
            point_id = md5(str(song_id).encode()).hexdigest()[:32]
            qdrant = QdrantManager()
            qdrant.upsert_audio_embedding(
                point_id=point_id,
                vector=embedding.tolist(),
                payload={
                    "song_id": str(song_id),
                    "audio_path": audio_path,
                },
            )
            logger.info("Audio processing complete for song_id=%s", song_id)
        except Exception as e:
            logger.error("Audio processing failed for song_id=%s: %s", song_id, e)

    async def _process_lyrics(
        self, song_id: uuid.UUID, raw_lyrics: str, sections: list[dict]
    ) -> None:
        """Chunk lyrics, store in DB, and embed in Qdrant."""
        logger.info("Processing lyrics for song_id=%s", song_id)
        try:
            words = re.findall(r"\w+", raw_lyrics.lower())
            word_count = len(words)
            unique_words = set(words)
            unique_word_count = len(unique_words)
            lexical_diversity = unique_word_count / word_count if word_count > 0 else 0.0

            chunker = LyricsChunker()
            chunks = chunker.chunk_lyrics(raw_lyrics)

            bar_chunks = [c for c in chunks if c.chunk_type == "bar"]

            async with async_session() as session:
                async with session.begin():
                    lyrics = Lyrics(
                        song_id=song_id,
                        full_text=raw_lyrics,
                        word_count=word_count,
                        unique_word_count=unique_word_count,
                        lexical_diversity=lexical_diversity,
                        source="genius",
                    )
                    session.add(lyrics)

                    for chunk in bar_chunks:
                        bar = Bar(
                            song_id=song_id,
                            text=chunk.text,
                            bar_index=chunk.chunk_index,
                            section=chunk.section,
                            mc=chunk.mc,
                        )
                        session.add(bar)

            embedder = LyricsEmbedder()
            embedded = embedder.embed_chunks(chunks)

            qdrant = QdrantManager()
            for i, (chunk, embedding) in enumerate(embedded):
                point_id = md5(f"{song_id}:{chunk.chunk_type}:{chunk.chunk_index}".encode()).hexdigest()[:32]
                qdrant.upsert_lyric_embedding(
                    point_id=point_id,
                    vector=embedding.tolist(),
                    payload={
                        "song_id": str(song_id),
                        "text": chunk.text[:500],
                        "chunk_type": chunk.chunk_type,
                        "chunk_index": chunk.chunk_index,
                        "section": chunk.section,
                        "mc": chunk.mc,
                    },
                )
            logger.info("Lyrics processing complete for song_id=%s (%d chunks)", song_id, len(embedded))
        except Exception as e:
            logger.error("Lyrics processing failed for song_id=%s: %s", song_id, e)

    async def _process_nlp(self, song_id: uuid.UUID) -> None:
        """Run topic classification, entity extraction, and bar annotation."""
        logger.info("Processing NLP for song_id=%s", song_id)
        try:
            async with async_session() as session:
                result = await session.execute(select(Song).where(Song.id == song_id))
                song = result.scalar_one()
                result = await session.execute(select(Lyrics).where(Lyrics.song_id == song_id))
                lyrics_record = result.scalar_one_or_none()

            if not lyrics_record:
                logger.warning("No lyrics found for song_id=%s, skipping NLP", song_id)
                return

            lyrics_text = lyrics_record.full_text

            # Topic classification
            classifier = TopicClassifier()
            topics = classifier.classify_song(lyrics_text)

            async with async_session() as session:
                async with session.begin():
                    result = await session.execute(select(Song).where(Song.id == song_id))
                    song = result.scalar_one()
                    song.primary_topics = topics["primary_topics"]
                    song.secondary_tags = topics["secondary_tags"]

            # Entity extraction
            time.sleep(1)
            extractor = EntityExtractor()
            entities = extractor.extract_entities(song.title, lyrics_text)

            async with async_session() as session:
                async with session.begin():
                    for mention in entities.get("artist_mentions", []):
                        em = EntityMention(
                            song_id=song_id,
                            entity_type="artist",
                            entity_name=mention["name"],
                            context=mention.get("context"),
                            stance=mention.get("stance"),
                        )
                        session.add(em)
                    for place in entities.get("place_references", []):
                        em = EntityMention(
                            song_id=song_id,
                            entity_type="place",
                            entity_name=place["name"],
                            context=place.get("context"),
                        )
                        session.add(em)
                    for ref in entities.get("cultural_references", []):
                        em = EntityMention(
                            song_id=song_id,
                            entity_type="cultural_reference",
                            entity_name=ref["name"],
                            context=ref.get("context"),
                        )
                        session.add(em)
                    for feat in entities.get("featured_artists", []):
                        fa = FeatureArtist(
                            song_id=song_id,
                            artist_name=feat["name"],
                            role=feat.get("role"),
                        )
                        session.add(fa)

            # Bar annotation
            time.sleep(1)
            async with async_session() as session:
                result = await session.execute(
                    select(Bar).where(Bar.song_id == song_id).order_by(Bar.bar_index)
                )
                bars = result.scalars().all()

            if bars:
                annotator = BarAnnotator()
                bar_texts = [b.text for b in bars]
                annotations = annotator.annotate_bars(song.title, bar_texts)

                async with async_session() as session:
                    async with session.begin():
                        for ann in annotations:
                            idx = ann.get("bar_index")
                            if idx is not None and idx < len(bars):
                                result = await session.execute(
                                    select(Bar).where(Bar.id == bars[idx].id)
                                )
                                bar = result.scalar_one()
                                bar.annotations = ann.get("annotations", [])
                                bar.punchline_explanation = ann.get("punchline_explanation")
                                bar.reference_target = ann.get("reference_target")
                                bar.rhyme_group = ann.get("rhyme_group")

            logger.info("NLP processing complete for song_id=%s", song_id)
        except Exception as e:
            logger.error("NLP processing failed for song_id=%s: %s", song_id, e)
