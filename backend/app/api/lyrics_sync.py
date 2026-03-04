"""Lyric synchronization API — fetch synced lyrics from LRCLIB or estimate timing."""

from __future__ import annotations

import logging
import re

import httpx
from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import select

from app.db.postgres import Bar, Song, Album, Artist, async_session
from app.ml.nlp.lyric_timer import estimate_bar_timing

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/songs", tags=["lyrics-sync"])


@router.get("/{song_id}/timing")
async def get_song_timing(
    song_id: str,
    source: str = Query("estimated", regex="^(estimated|synced)$"),
):
    """Get bar timing for a song.

    source=estimated: BPM/duration-based estimation
    source=synced: Try LRCLIB first, fallback to estimated
    """
    async with async_session() as session:
        song = await session.get(Song, song_id)
        if not song:
            raise HTTPException(404, "Song not found")

        if source == "synced":
            # Try LRCLIB
            synced = await _fetch_lrclib_timing(session, song)
            if synced:
                return {"bars": synced, "source": "lrclib"}

        # Fallback to estimation
        timings = await estimate_bar_timing(session, song_id)
        return {"bars": timings, "source": "estimated"}


@router.post("/{song_id}/compute-timing")
async def compute_timing(song_id: str):
    """Compute and store estimated timing for a song's bars."""
    async with async_session() as session:
        song = await session.get(Song, song_id)
        if not song:
            raise HTTPException(404, "Song not found")

        timings = await estimate_bar_timing(session, song_id)
        return {"bars": timings, "source": "estimated", "count": len(timings)}


async def _fetch_lrclib_timing(session, song: Song) -> list[dict] | None:
    """Try to fetch synced lyrics from LRCLIB and match to our bars."""
    # Get artist name
    result = await session.execute(
        select(Album).where(Album.id == song.album_id)
    )
    album = result.scalar_one_or_none()
    if not album:
        return None

    result = await session.execute(
        select(Artist).where(Artist.id == album.artist_id)
    )
    artist = result.scalar_one_or_none()
    artist_name = artist.name if artist else "Seedhe Maut"

    # Clean title for search (remove ft. and parenthetical)
    clean_title = re.sub(r"\s*\(.*?\)", "", song.title)
    clean_title = re.sub(r"\s*ft\..*", "", clean_title, flags=re.IGNORECASE)

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                "https://lrclib.net/api/get",
                params={
                    "track_name": clean_title,
                    "artist_name": artist_name,
                    "album_name": album.title if album else "",
                },
            )

            if resp.status_code != 200:
                logger.debug("LRCLIB returned %d for '%s'", resp.status_code, song.title)
                return None

            data = resp.json()
            synced_lyrics = data.get("syncedLyrics")
            if not synced_lyrics:
                return None

            # Parse LRC format: [mm:ss.xx] text
            lrc_lines = _parse_lrc(synced_lyrics)
            if not lrc_lines:
                return None

            # Match LRC lines to our bars
            return await _match_lrc_to_bars(session, song.id, lrc_lines)

    except Exception as e:
        logger.debug("LRCLIB fetch failed for '%s': %s", song.title, e)
        return None


def _parse_lrc(lrc_text: str) -> list[tuple[int, str]]:
    """Parse LRC format into list of (timestamp_ms, text) tuples."""
    lines = []
    pattern = re.compile(r"\[(\d+):(\d+)\.(\d+)\]\s*(.*)")

    for line in lrc_text.strip().split("\n"):
        match = pattern.match(line.strip())
        if match:
            minutes = int(match.group(1))
            seconds = int(match.group(2))
            centiseconds = int(match.group(3))
            text = match.group(4).strip()

            ms = (minutes * 60 + seconds) * 1000 + centiseconds * 10
            if text:  # Skip empty lines
                lines.append((ms, text))

    return lines


async def _match_lrc_to_bars(
    session, song_id, lrc_lines: list[tuple[int, str]]
) -> list[dict] | None:
    """Match LRC timestamp lines to our stored bars using fuzzy text matching."""
    result = await session.execute(
        select(Bar).where(Bar.song_id == song_id).order_by(Bar.bar_index)
    )
    bars = list(result.scalars().all())

    if not bars:
        return None

    timings: list[dict] = []
    lrc_idx = 0

    for bar in bars:
        bar_text_lower = bar.text.lower().strip()

        # Find best matching LRC line (simple substring/prefix match)
        best_match_idx = None
        best_score = 0

        for j in range(lrc_idx, min(lrc_idx + 5, len(lrc_lines))):
            lrc_text_lower = lrc_lines[j][1].lower().strip()

            # Check overlap
            if bar_text_lower in lrc_text_lower or lrc_text_lower in bar_text_lower:
                score = len(set(bar_text_lower.split()) & set(lrc_text_lower.split()))
                if score > best_score:
                    best_score = score
                    best_match_idx = j

        if best_match_idx is not None and best_score >= 2:
            start_ms = lrc_lines[best_match_idx][0]
            # End time is start of next line, or +3000ms
            end_ms = (
                lrc_lines[best_match_idx + 1][0]
                if best_match_idx + 1 < len(lrc_lines)
                else start_ms + 3000
            )

            bar.start_ms = start_ms
            bar.end_ms = end_ms

            timings.append({
                "bar_index": bar.bar_index,
                "start_ms": start_ms,
                "end_ms": end_ms,
            })

            lrc_idx = best_match_idx + 1
        else:
            # No match — will be filled by estimation later
            timings.append({
                "bar_index": bar.bar_index,
                "start_ms": None,
                "end_ms": None,
            })

    await session.commit()

    # Check if we got enough matches (at least 30%)
    matched = sum(1 for t in timings if t["start_ms"] is not None)
    if matched < len(bars) * 0.3:
        logger.debug(
            "Too few LRCLIB matches for '%s': %d/%d",
            song_id, matched, len(bars),
        )
        return None

    return timings
