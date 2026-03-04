"""Cost-optimized ingestion: audio features + lyrics + embeddings, NO Claude API calls.

Processes songs that already exist in the DB (from seed_discography.py) and have
audio files on disk. Runs:
  1. Librosa audio features (tempo, key, energy, etc.)
  2. CLAP audio embeddings -> Qdrant
  3. Genius lyrics fetch
  4. Lyrics chunking + sentence-transformer embeddings -> Qdrant
  5. Topic classification (zero-shot, local model - FREE)

Skips (saves Claude API credits):
  - Entity extraction (Claude Sonnet)
  - Bar annotation (Claude Sonnet)

Usage:
    python ml/scripts/ingest_no_nlp.py [--album SLUG] [--skip-audio] [--skip-lyrics] [--dry-run]
"""

import argparse
import asyncio
import logging
import re
import sys
import time
from hashlib import md5
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "backend"))

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)-7s %(message)s",
)
logger = logging.getLogger("ingest")


async def ingest(
    album_slug: str | None,
    skip_audio: bool,
    skip_lyrics: bool,
    dry_run: bool,
):
    from sqlalchemy import select
    from sqlalchemy.orm import selectinload

    from app.config import settings
    from app.db.postgres import Album, Artist, Bar, Lyrics, Song, async_session
    from app.db.qdrant import QdrantManager
    from app.ingestion.genius import GeniusClient
    from app.ml.audio.clap_encoder import CLAPEncoder
    from app.ml.audio.librosa_features import LibrosaFeatureExtractor
    from app.ml.lyrics.chunker import LyricsChunker
    from app.ml.lyrics.embedder import LyricsEmbedder
    from app.ml.nlp.topic_classifier import TopicClassifier

    audio_base = Path(settings.audio_base_path)
    artist_slug = "seedhe-maut"

    # Load all songs
    async with async_session() as session:
        query = (
            select(Song)
            .join(Album)
            .join(Artist)
            .where(Artist.slug == artist_slug)
            .options(selectinload(Song.album), selectinload(Song.lyrics))
            .order_by(Album.slug, Song.track_number)
        )
        if album_slug:
            query = query.where(Album.slug == album_slug)
        result = await session.execute(query)
        songs = result.scalars().all()

    logger.info("Found %d songs in DB", len(songs))

    # Filter to songs needing processing
    to_process = []
    for song in songs:
        album_dir = audio_base / artist_slug / song.album.slug
        total_tracks = len([s for s in songs if s.album_id == song.album_id])
        pad = len(str(total_tracks))
        audio_path = album_dir / f"{str(song.track_number).zfill(pad)} - {song.title}.mp3"

        needs_audio = not skip_audio and song.tempo_bpm is None and audio_path.exists()
        needs_lyrics = not skip_lyrics and song.lyrics is None
        has_audio = audio_path.exists()

        if needs_audio or needs_lyrics:
            to_process.append({
                "song": song,
                "audio_path": str(audio_path) if has_audio else None,
                "needs_audio": needs_audio,
                "needs_lyrics": needs_lyrics,
                "album_slug": song.album.slug,
            })

    logger.info("%d songs need processing", len(to_process))

    if dry_run:
        print(f"\n=== Would process {len(to_process)} songs ===")
        for entry in to_process:
            s = entry["song"]
            parts = []
            if entry["needs_audio"]:
                parts.append("AUDIO")
            if entry["needs_lyrics"]:
                parts.append("LYRICS")
            has_file = "has file" if entry["audio_path"] else "NO FILE"
            print(f"  [{entry['album_slug']}] {s.track_number:2d}. {s.title} ({', '.join(parts)}) [{has_file}]")
        return

    # Initialize models lazily
    feature_extractor = None
    clap_encoder = None
    lyrics_embedder = None
    genius = None
    topic_classifier = None
    qdrant = QdrantManager()

    processed = 0
    failed = 0

    for entry in to_process:
        song = entry["song"]
        logger.info(
            "Processing [%s] %d. %s",
            entry["album_slug"],
            song.track_number,
            song.title,
        )

        try:
            # === AUDIO PIPELINE ===
            if entry["needs_audio"] and entry["audio_path"]:
                if feature_extractor is None:
                    feature_extractor = LibrosaFeatureExtractor()
                if clap_encoder is None:
                    clap_encoder = CLAPEncoder()

                # Librosa features
                features = feature_extractor.extract_features(entry["audio_path"])
                async with async_session() as session:
                    async with session.begin():
                        result = await session.execute(
                            select(Song).where(Song.id == song.id)
                        )
                        s = result.scalar_one()
                        s.duration_seconds = features["duration_seconds"]
                        s.tempo_bpm = features["tempo"]
                        s.key = features["key"]
                        s.energy = features["energy"]
                        s.spectral_centroid = features["spectral_centroid"]
                        s.onset_density = features["onset_density"]
                        s.mood_energy = features["mood_energy"]
                        s.audio_path = entry["audio_path"]

                # CLAP embedding
                embedding = clap_encoder.encode_audio(entry["audio_path"])
                point_id = md5(str(song.id).encode()).hexdigest()[:32]
                qdrant.upsert_audio_embedding(
                    point_id=point_id,
                    vector=embedding.tolist(),
                    payload={
                        "song_id": str(song.id),
                        "audio_path": entry["audio_path"],
                    },
                )
                logger.info("  Audio features + CLAP done")

            # === LYRICS PIPELINE ===
            if entry["needs_lyrics"]:
                if genius is None:
                    genius = GeniusClient()
                if lyrics_embedder is None:
                    lyrics_embedder = LyricsEmbedder()
                if topic_classifier is None:
                    topic_classifier = TopicClassifier()

                # Fetch from Genius
                raw_lyrics = genius.fetch_song_lyrics(
                    "Seedhe Maut", song.title
                )
                if not raw_lyrics:
                    logger.warning("  No lyrics found on Genius for: %s", song.title)
                else:
                    # Store lyrics + bars
                    words = re.findall(r"\w+", raw_lyrics.lower())
                    word_count = len(words)
                    unique_words = set(words)
                    lexical_diversity = len(unique_words) / word_count if word_count > 0 else 0.0

                    chunker = LyricsChunker()
                    chunks = chunker.chunk_lyrics(raw_lyrics)
                    bar_chunks = [c for c in chunks if c.chunk_type == "bar"]

                    async with async_session() as session:
                        async with session.begin():
                            lyrics_obj = Lyrics(
                                song_id=song.id,
                                full_text=raw_lyrics,
                                word_count=word_count,
                                unique_word_count=len(unique_words),
                                lexical_diversity=lexical_diversity,
                                source="genius",
                            )
                            session.add(lyrics_obj)
                            for chunk in bar_chunks:
                                bar = Bar(
                                    song_id=song.id,
                                    text=chunk.text,
                                    bar_index=chunk.chunk_index,
                                    section=chunk.section,
                                    mc=chunk.mc,
                                )
                                session.add(bar)

                    # Embed all chunks in Qdrant
                    embedded = lyrics_embedder.embed_chunks(chunks)
                    for chunk, emb in embedded:
                        point_id = md5(
                            f"{song.id}:{chunk.chunk_type}:{chunk.chunk_index}".encode()
                        ).hexdigest()[:32]
                        qdrant.upsert_lyric_embedding(
                            point_id=point_id,
                            vector=emb.tolist(),
                            payload={
                                "song_id": str(song.id),
                                "text": chunk.text[:500],
                                "chunk_type": chunk.chunk_type,
                                "chunk_index": chunk.chunk_index,
                                "section": chunk.section,
                                "mc": chunk.mc,
                            },
                        )

                    # Topic classification (FREE - local zero-shot model)
                    topics = topic_classifier.classify_song(raw_lyrics)
                    async with async_session() as session:
                        async with session.begin():
                            result = await session.execute(
                                select(Song).where(Song.id == song.id)
                            )
                            s = result.scalar_one()
                            s.primary_topics = topics["primary_topics"]
                            s.secondary_tags = topics["secondary_tags"]

                    logger.info(
                        "  Lyrics + embeddings + topics done (%d chunks, topics=%s)",
                        len(embedded),
                        topics["primary_topics"],
                    )

                    # Rate limit Genius
                    time.sleep(0.5)

            processed += 1

        except Exception as e:
            logger.error("  FAILED: %s", e)
            failed += 1

    print(f"\n=== Ingestion Summary ===")
    print(f"  Processed: {processed}")
    print(f"  Failed: {failed}")
    print(f"  Claude API calls: 0 (NLP skipped)")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--album", type=str, help="Only process this album slug")
    parser.add_argument("--skip-audio", action="store_true", help="Skip audio processing")
    parser.add_argument("--skip-lyrics", action="store_true", help="Skip lyrics processing")
    parser.add_argument("--dry-run", action="store_true", help="Show what would be processed")
    args = parser.parse_args()
    asyncio.run(ingest(args.album, args.skip_audio, args.skip_lyrics, args.dry_run))
