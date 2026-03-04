"""Estimate bar-level timing from song duration and structure."""

from __future__ import annotations

import logging
from collections import defaultdict

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.postgres import Bar, Song

logger = logging.getLogger(__name__)


async def estimate_bar_timing(session: AsyncSession, song_id: str) -> list[dict]:
    """Estimate start_ms and end_ms for each bar based on song duration and section structure.

    Strategy:
    1. Get song duration and all bars ordered by index
    2. Group bars by section
    3. Distribute time proportionally by section bar count
    4. Within a section, distribute evenly
    """
    song = await session.get(Song, song_id)
    if not song or not song.duration_seconds:
        logger.warning("Song %s not found or missing duration", song_id)
        return []

    result = await session.execute(
        select(Bar).where(Bar.song_id == song_id).order_by(Bar.bar_index)
    )
    bars = list(result.scalars().all())

    if not bars:
        return []

    total_ms = int(song.duration_seconds * 1000)

    # Group bars by section (preserve order)
    sections: list[tuple[str | None, list[Bar]]] = []
    current_section = None
    current_bars: list[Bar] = []

    for bar in bars:
        if bar.section != current_section:
            if current_bars:
                sections.append((current_section, current_bars))
            current_section = bar.section
            current_bars = [bar]
        else:
            current_bars.append(bar)

    if current_bars:
        sections.append((current_section, current_bars))

    total_bars = len(bars)

    # Distribute time proportionally by section size
    # Leave small gaps between sections (2% of song duration split across section boundaries)
    section_gap_ms = int(total_ms * 0.005)  # 0.5% gap per section boundary
    num_gaps = max(0, len(sections) - 1)
    available_ms = total_ms - (section_gap_ms * num_gaps)

    timings: list[dict] = []
    current_ms = 0

    for section_idx, (section_name, section_bars) in enumerate(sections):
        section_duration = int(available_ms * (len(section_bars) / total_bars))
        bar_duration = section_duration // len(section_bars)

        for i, bar in enumerate(section_bars):
            start = current_ms + (i * bar_duration)
            end = start + bar_duration

            bar.start_ms = start
            bar.end_ms = end

            timings.append({
                "bar_index": bar.bar_index,
                "start_ms": start,
                "end_ms": end,
            })

        current_ms += section_duration + section_gap_ms

    await session.commit()

    logger.info(
        "Estimated timing for %d bars in '%s' (%d ms)",
        len(bars), song.title, total_ms,
    )
    return timings
