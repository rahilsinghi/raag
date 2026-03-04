from __future__ import annotations

import json
import logging
import re

import anthropic
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.config import settings
from app.db.postgres import (
    Album,
    Bar,
    EntityMention,
    FeatureArtist,
    Lyrics,
    Song,
    async_session,
)

logger = logging.getLogger(__name__)


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
        "release_year": song.album.release_year,
        "track_number": song.track_number,
        "duration_seconds": song.duration_seconds,
        "tempo_bpm": song.tempo_bpm,
        "key": song.key,
        "energy": song.energy,
        "mood_energy": song.mood_energy,
        "primary_topics": song.primary_topics or [],
        "secondary_tags": song.secondary_tags or [],
        "spotify_track_id": song.spotify_track_id,
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


DESCRIBE_BAR_PROMPT = """You are an expert analyst of Indian hip-hop, specifically Seedhe Maut (a duo of Encore ABJ and Calm).

Analyze this bar/line and provide a detailed breakdown. Return ONLY valid JSON.

Song: "{title}"
Bar: "{bar_text}"

Context (surrounding bars):
{context_bars}

Return JSON:
{{
  "translation": "English translation if the bar is in Hindi/Devanagari, null if already in English",
  "meaning": "What this bar means — the message or story being told",
  "wordplay": "Any wordplay, double meanings, bilingual puns, or clever Hindi-English mixing. null if none",
  "cultural_references": ["list of cultural references — Bollywood, mythology, brands, places, etc."],
  "flow_notes": "Any notable flow patterns, rhyme schemes, or delivery notes. null if nothing special",
  "song_context": "How this bar fits into the larger song's theme or narrative. null if standalone",
  "tldr": "One-sentence summary of what makes this bar interesting or notable"
}}"""


async def describe_bar(bar_id: str) -> dict | None:
    """Get a Claude-powered analysis of a specific bar, with caching."""
    async with async_session() as session:
        result = await session.execute(
            select(Bar)
            .options(selectinload(Bar.song).selectinload(Song.album))
            .where(Bar.id == bar_id)
        )
        bar = result.scalar_one_or_none()

    if not bar:
        return None

    # Check cache in metadata_
    if bar.metadata_ and "description" in bar.metadata_:
        cached = bar.metadata_["description"]
        cached["bar_id"] = str(bar.id)
        cached["text"] = bar.text
        return cached

    # Fetch surrounding bars for context
    async with async_session() as session:
        result = await session.execute(
            select(Bar)
            .where(Bar.song_id == bar.song_id)
            .order_by(Bar.bar_index)
        )
        all_bars = result.scalars().all()

    # Get 5 bars around the target
    bar_idx = next(
        (i for i, b in enumerate(all_bars) if b.id == bar.id), 0
    )
    start = max(0, bar_idx - 2)
    end = min(len(all_bars), bar_idx + 3)
    context_bars = "\n".join(
        f"{'>>>' if b.id == bar.id else '   '} {b.text}"
        for b in all_bars[start:end]
    )

    prompt = DESCRIBE_BAR_PROMPT.format(
        title=bar.song.title,
        bar_text=bar.text,
        context_bars=context_bars,
    )

    try:
        client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
        response = client.messages.create(
            model=settings.claude_model,
            max_tokens=1500,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = response.content[0].text

        # Extract JSON
        code_match = re.search(r"```(?:json)?\s*([\s\S]*?)```", raw)
        if code_match:
            raw = code_match.group(1)
        description = json.loads(raw.strip())
    except Exception as e:
        logger.error("Failed to describe bar %s: %s", bar_id, e)
        description = {
            "translation": None,
            "meaning": "Analysis unavailable",
            "wordplay": None,
            "cultural_references": [],
            "flow_notes": None,
            "song_context": None,
            "tldr": "Could not analyze this bar",
        }

    # Cache in metadata_
    async with async_session() as session:
        async with session.begin():
            result = await session.execute(
                select(Bar).where(Bar.id == bar.id)
            )
            db_bar = result.scalar_one()
            existing = db_bar.metadata_ or {}
            existing["description"] = description
            db_bar.metadata_ = existing

    description["bar_id"] = str(bar.id)
    description["text"] = bar.text
    return description
