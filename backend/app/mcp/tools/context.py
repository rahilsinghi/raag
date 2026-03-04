from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.db.postgres import (
    Album,
    Bar,
    EntityMention,
    FeatureArtist,
    Lyrics,
    Song,
    async_session,
)


async def get_song_context(song_id: str) -> dict | None:
    """Get full song detail with lyrics, bars, entities, and features."""
    async with async_session() as session:
        result = await session.execute(
            select(Song)
            .options(
                selectinload(Song.album),
                selectinload(Song.lyrics),
                selectinload(Song.bars),
                selectinload(Song.entity_mentions),
                selectinload(Song.feature_artists),
            )
            .where(Song.id == song_id)
        )
        song = result.scalar_one_or_none()

    if not song:
        return None

    bars_sorted = sorted(song.bars, key=lambda b: b.bar_index)

    return {
        "id": str(song.id),
        "title": song.title,
        "album_title": song.album.title,
        "track_number": song.track_number,
        "duration_seconds": song.duration_seconds,
        "tempo_bpm": song.tempo_bpm,
        "key": song.key,
        "energy": song.energy,
        "mood_energy": song.mood_energy,
        "primary_topics": song.primary_topics or [],
        "secondary_tags": song.secondary_tags or [],
        "lyrics_text": song.lyrics.full_text if song.lyrics else None,
        "word_count": song.lyrics.word_count if song.lyrics else None,
        "unique_word_count": song.lyrics.unique_word_count if song.lyrics else None,
        "lexical_diversity": song.lyrics.lexical_diversity if song.lyrics else None,
        "bars": [
            {
                "id": str(b.id),
                "song_id": str(b.song_id),
                "song_title": song.title,
                "text": b.text,
                "section": b.section,
                "mc": b.mc,
                "bar_index": b.bar_index,
                "annotations": b.annotations or [],
                "punchline_explanation": b.punchline_explanation,
                "reference_target": b.reference_target,
                "rhyme_group": b.rhyme_group,
            }
            for b in bars_sorted
        ],
        "entities": [
            {
                "entity_type": e.entity_type,
                "entity_name": e.entity_name,
                "context": e.context,
                "stance": e.stance,
            }
            for e in song.entity_mentions
        ],
        "features": [
            {
                "artist_name": f.artist_name,
                "role": f.role,
            }
            for f in song.feature_artists
        ],
    }
