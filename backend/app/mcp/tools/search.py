from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.db.postgres import Album, Bar, Song, async_session
from app.db.qdrant import QdrantManager
from app.mcp.types import BarResult, LyricResult, SongResult
from app.ml.audio.clap_encoder import CLAPEncoder
from app.ml.lyrics.embedder import LyricsEmbedder


async def _enrich_song(song_id: str) -> dict | None:
    """Fetch song + album info from Postgres."""
    async with async_session() as session:
        result = await session.execute(
            select(Song)
            .options(selectinload(Song.album).selectinload(Album.artist))
            .where(Song.id == song_id)
        )
        song = result.scalar_one_or_none()
        if not song:
            return None
        return {
            "id": str(song.id),
            "title": song.title,
            "album_title": song.album.title,
            "track_number": song.track_number,
            "tempo_bpm": song.tempo_bpm,
            "key": song.key,
            "energy": song.energy,
            "mood_energy": song.mood_energy,
            "primary_topics": song.primary_topics or [],
            "secondary_tags": song.secondary_tags or [],
        }


async def search_by_mood(
    description: str,
    artist_id: str | None = None,
    album_id: str | None = None,
    limit: int = 5,
) -> list[dict]:
    """Search songs by mood/sound description using CLAP audio embeddings."""
    encoder = CLAPEncoder()
    query_vec = encoder.encode_text(description).tolist()

    filters = {}
    if artist_id:
        filters["artist_id"] = artist_id
    if album_id:
        filters["album_id"] = album_id

    qdrant = QdrantManager()
    results = qdrant.search_audio(query_vec, limit=limit, filters=filters or None)

    songs = []
    for point in results.points:
        song_id = point.payload.get("song_id")
        if song_id:
            enriched = await _enrich_song(song_id)
            if enriched:
                enriched["score"] = point.score
                songs.append(enriched)

    return songs


async def search_by_lyrics(
    query: str,
    search_level: str = "section",
    artist_id: str | None = None,
    album_id: str | None = None,
    limit: int = 5,
) -> list[dict]:
    """Search lyrics by semantic similarity."""
    embedder = LyricsEmbedder()
    query_vec = embedder.embed_text(query).tolist()

    filters = {}
    if search_level:
        filters["chunk_type"] = search_level
    if artist_id:
        filters["artist_id"] = artist_id
    if album_id:
        filters["album_id"] = album_id

    qdrant = QdrantManager()
    results = qdrant.search_lyrics(query_vec, limit=limit, filters=filters or None)

    lyric_results = []
    for point in results.points:
        payload = point.payload
        song_id = payload.get("song_id")

        song_info = await _enrich_song(song_id) if song_id else None
        song_title = song_info["title"] if song_info else "Unknown"

        lyric_results.append({
            "song_id": song_id or "",
            "song_title": song_title,
            "text": payload.get("text", ""),
            "chunk_type": payload.get("chunk_type", ""),
            "section": payload.get("section"),
            "mc": payload.get("mc"),
            "score": point.score,
        })

    return lyric_results


async def search_bars(
    query: str,
    annotation_type: str | None = None,
    mc: str | None = None,
    limit: int = 10,
) -> list[dict]:
    """Search bars (individual lines) by semantic similarity with optional filters."""
    embedder = LyricsEmbedder()
    query_vec = embedder.embed_text(query).tolist()

    filters = {"chunk_type": "bar"}
    if mc:
        filters["mc"] = mc

    qdrant = QdrantManager()
    results = qdrant.search_lyrics(query_vec, limit=limit * 2, filters=filters)

    bar_results = []
    for point in results.points:
        payload = point.payload
        song_id = payload.get("song_id")

        async with async_session() as session:
            result = await session.execute(
                select(Bar).where(
                    Bar.song_id == song_id,
                    Bar.text == payload.get("text", ""),
                )
            )
            bar = result.scalar_one_or_none()

        if bar:
            if annotation_type and (not bar.annotations or annotation_type not in bar.annotations):
                continue

            song_info = await _enrich_song(song_id) if song_id else None
            bar_results.append({
                "id": str(bar.id),
                "song_id": song_id or "",
                "song_title": song_info["title"] if song_info else "Unknown",
                "text": bar.text,
                "section": bar.section,
                "mc": bar.mc,
                "bar_index": bar.bar_index,
                "annotations": bar.annotations or [],
                "punchline_explanation": bar.punchline_explanation,
                "reference_target": bar.reference_target,
                "rhyme_group": bar.rhyme_group,
            })

        if len(bar_results) >= limit:
            break

    return bar_results
