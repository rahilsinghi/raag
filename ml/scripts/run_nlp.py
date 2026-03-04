"""Run NLP processing (entity extraction + bar annotation) on songs missing NLP data.

Uses Claude API via EntityExtractor and BarAnnotator classes.
Incremental: skips songs that already have entities/annotations.

Usage:
    python ml/scripts/run_nlp.py [--album SLUG] [--skip-entities] [--skip-bars] [--dry-run] [--delay 1.5]
"""

import argparse
import asyncio
import logging
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "backend"))

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)-7s %(message)s",
)
logger = logging.getLogger("run_nlp")


async def run_nlp(
    album_slug: str | None,
    skip_entities: bool,
    skip_bars: bool,
    dry_run: bool,
    delay: float,
):
    from sqlalchemy import select, func as sqlfunc
    from sqlalchemy.orm import selectinload

    from app.db.postgres import (
        Album,
        Artist,
        Bar,
        EntityMention,
        FeatureArtist,
        Song,
        async_session,
    )
    from app.ml.nlp.bar_annotator import BarAnnotator
    from app.ml.nlp.entity_extractor import EntityExtractor

    artist_slug = "seedhe-maut"

    # Load songs with lyrics and existing entity/bar counts
    async with async_session() as session:
        query = (
            select(Song)
            .join(Album)
            .join(Artist)
            .where(Artist.slug == artist_slug)
            .options(
                selectinload(Song.album),
                selectinload(Song.lyrics),
                selectinload(Song.bars),
                selectinload(Song.entity_mentions),
            )
            .order_by(Album.slug, Song.track_number)
        )
        if album_slug:
            query = query.where(Album.slug == album_slug)
        result = await session.execute(query)
        songs = result.scalars().all()

    logger.info("Found %d songs in DB", len(songs))

    # Filter to songs needing NLP
    to_process = []
    for song in songs:
        if song.lyrics is None:
            continue  # No lyrics to process

        has_entities = len(song.entity_mentions) > 0
        bars = sorted(song.bars, key=lambda b: b.bar_index)
        has_bar_annotations = any(
            b.annotations and len(b.annotations) > 0 for b in bars
        )

        needs_entities = not skip_entities and not has_entities
        needs_bars = not skip_bars and not has_bar_annotations and len(bars) > 0

        if needs_entities or needs_bars:
            to_process.append({
                "song": song,
                "lyrics_text": song.lyrics.full_text,
                "bars": bars,
                "needs_entities": needs_entities,
                "needs_bars": needs_bars,
                "album_slug": song.album.slug,
            })

    logger.info("%d songs need NLP processing", len(to_process))

    if dry_run:
        entity_count = sum(1 for e in to_process if e["needs_entities"])
        bar_count = sum(1 for e in to_process if e["needs_bars"])
        print(f"\n=== Would process {len(to_process)} songs ===")
        print(f"  Entity extraction: {entity_count} songs")
        print(f"  Bar annotation: {bar_count} songs")
        print(f"  Estimated cost: ~${entity_count * 0.02 + bar_count * 0.04:.2f}")
        print()
        for entry in to_process:
            s = entry["song"]
            parts = []
            if entry["needs_entities"]:
                parts.append("ENTITIES")
            if entry["needs_bars"]:
                parts.append(f"BARS({len(entry['bars'])})")
            print(
                f"  [{entry['album_slug']}] {s.track_number or 0:2d}. {s.title} "
                f"({', '.join(parts)})"
            )
        return

    # Initialize NLP tools
    entity_extractor = EntityExtractor() if not skip_entities else None
    bar_annotator = BarAnnotator() if not skip_bars else None

    processed = 0
    failed = 0
    api_calls = 0

    for i, entry in enumerate(to_process):
        song = entry["song"]
        logger.info(
            "[%d/%d] Processing [%s] %d. %s",
            i + 1,
            len(to_process),
            entry["album_slug"],
            song.track_number or 0,
            song.title,
        )

        try:
            # === ENTITY EXTRACTION ===
            if entry["needs_entities"] and entity_extractor:
                entities = entity_extractor.extract_entities(
                    song.title, entry["lyrics_text"]
                )
                api_calls += 1

                async with async_session() as session:
                    async with session.begin():
                        # Save artist mentions
                        for mention in entities.get("artist_mentions", []):
                            session.add(EntityMention(
                                song_id=song.id,
                                entity_type="artist",
                                entity_name=mention["name"],
                                context=mention.get("context"),
                                stance=mention.get("stance"),
                            ))
                        # Save place references
                        for place in entities.get("place_references", []):
                            session.add(EntityMention(
                                song_id=song.id,
                                entity_type="place",
                                entity_name=place["name"],
                                context=place.get("context"),
                            ))
                        # Save cultural references
                        for ref in entities.get("cultural_references", []):
                            session.add(EntityMention(
                                song_id=song.id,
                                entity_type="cultural_reference",
                                entity_name=ref["name"],
                                context=ref.get("context"),
                                metadata_={"ref_type": ref.get("type")},
                            ))
                        # Save self references
                        for selfref in entities.get("self_references", []):
                            session.add(EntityMention(
                                song_id=song.id,
                                entity_type="self_reference",
                                entity_name=selfref.get("target", ""),
                                context=selfref.get("text"),
                            ))
                        # Save featured artists
                        for feat in entities.get("featured_artists", []):
                            session.add(FeatureArtist(
                                song_id=song.id,
                                artist_name=feat["name"],
                                role=feat.get("role"),
                            ))

                entity_counts = {
                    k: len(v) for k, v in entities.items()
                    if isinstance(v, list) and not k.startswith("_")
                }
                logger.info("  Entities: %s", entity_counts)
                time.sleep(delay)

            # === BAR ANNOTATION ===
            if entry["needs_bars"] and bar_annotator:
                bars = entry["bars"]
                bar_texts = [b.text for b in bars]
                annotations = bar_annotator.annotate_bars(song.title, bar_texts)
                api_calls += 1 + (len(bar_texts) - 1) // 50  # count batches

                # Map annotations back to bars by index
                annotation_map = {a["bar_index"]: a for a in annotations}

                async with async_session() as session:
                    async with session.begin():
                        for bar in bars:
                            ann = annotation_map.get(bar.bar_index)
                            if ann:
                                result = await session.execute(
                                    select(Bar).where(Bar.id == bar.id)
                                )
                                db_bar = result.scalar_one()
                                db_bar.annotations = ann.get("annotations", [])
                                db_bar.punchline_explanation = ann.get(
                                    "punchline_explanation"
                                )
                                db_bar.reference_target = ann.get("reference_target")
                                db_bar.rhyme_group = ann.get("rhyme_group")

                annotated_count = sum(
                    1 for a in annotations
                    if a.get("annotations") and len(a["annotations"]) > 0
                )
                logger.info(
                    "  Bars: %d total, %d annotated",
                    len(bars),
                    annotated_count,
                )
                time.sleep(delay)

            processed += 1

        except Exception as e:
            logger.error("  FAILED: %s", e, exc_info=True)
            failed += 1

    print(f"\n=== NLP Processing Summary ===")
    print(f"  Processed: {processed}")
    print(f"  Failed: {failed}")
    print(f"  API calls: {api_calls}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Run NLP (entity extraction + bar annotation) on songs"
    )
    parser.add_argument("--album", type=str, help="Only process this album slug")
    parser.add_argument(
        "--skip-entities", action="store_true", help="Skip entity extraction"
    )
    parser.add_argument(
        "--skip-bars", action="store_true", help="Skip bar annotation"
    )
    parser.add_argument(
        "--dry-run", action="store_true", help="Show what would be processed"
    )
    parser.add_argument(
        "--delay",
        type=float,
        default=1.5,
        help="Delay between API calls in seconds (default: 1.5)",
    )
    args = parser.parse_args()
    asyncio.run(
        run_nlp(args.album, args.skip_entities, args.skip_bars, args.dry_run, args.delay)
    )
