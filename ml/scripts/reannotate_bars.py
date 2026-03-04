"""Re-run bar annotation for all ingested songs.

Use this after fixing the bar annotator to populate annotations
that were lost due to JSON parsing failures.
"""

import asyncio
import sys
import time
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "backend"))

import logging

from sqlalchemy import select

from app.db.postgres import Bar, Song, async_session
from app.ml.nlp.bar_annotator import BarAnnotator

logging.basicConfig(level=logging.INFO, format="%(levelname)s  %(message)s")
logger = logging.getLogger(__name__)


async def reannotate_all():
    annotator = BarAnnotator()

    async with async_session() as session:
        result = await session.execute(select(Song).order_by(Song.track_number))
        songs = result.scalars().all()

    logger.info("Found %d songs to re-annotate", len(songs))
    success = 0

    for song in songs:
        async with async_session() as session:
            result = await session.execute(
                select(Bar).where(Bar.song_id == song.id).order_by(Bar.bar_index)
            )
            bars = result.scalars().all()

        if not bars:
            logger.info("Skipping '%s' — no bars", song.title)
            continue

        logger.info("Annotating '%s' (%d bars)...", song.title, len(bars))
        bar_texts = [b.text for b in bars]

        annotations = annotator.annotate_bars(song.title, bar_texts)

        # Check if we got real annotations (not all empty)
        has_annotations = any(ann.get("annotations") for ann in annotations)

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

        status = "with annotations" if has_annotations else "EMPTY annotations"
        logger.info("  → Updated '%s' — %s", song.title, status)
        success += 1

        # Rate limit between songs
        time.sleep(1)

    logger.info("Done! Re-annotated %d/%d songs", success, len(songs))


if __name__ == "__main__":
    asyncio.run(reannotate_all())
