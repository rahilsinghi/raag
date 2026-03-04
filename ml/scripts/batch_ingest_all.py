"""Batch ingest all Seedhe Maut albums (excluding Nayaab, already ingested)."""

import asyncio
import json
import logging
import sys
import time
import traceback
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "backend"))

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(
            Path(__file__).resolve().parent / "batch_ingest_all.log", mode="w"
        ),
    ],
)
logger = logging.getLogger(__name__)

# Album definitions: (album_name for Genius, album_slug for local dirs, release_year)
# Nayaab is excluded -- already ingested.
ALBUMS = [
    ("2 Ka Pahada", "2-ka-pahada", 2017),
    ("Bayaan", "bayaan", 2018),
    ("DL91 FM", "dl91-fm", 2024),
    ("Kshama", "kshama", 2025),
    ("Lunch Break", "lunch-break", 2021),
    ("n", "n", 2019),
    ("Shakti", "shakti", 2024),
    # Singles is a virtual album -- will need special handling
    # The Genius API may not have a "Singles" album, so we skip it for now
    # and handle it separately if needed.
]

ARTIST_NAME = "Seedhe Maut"
ARTIST_SLUG = "seedhe-maut"


async def ingest_one_album(pipeline, album_name, album_slug, release_year):
    """Ingest a single album and return the result summary."""
    logger.info("=" * 60)
    logger.info("STARTING: %s (slug=%s, year=%s)", album_name, album_slug, release_year)
    logger.info("=" * 60)
    start = time.time()

    try:
        result = await pipeline.ingest_album(
            artist_name=ARTIST_NAME,
            artist_slug=ARTIST_SLUG,
            album_name=album_name,
            album_slug=album_slug,
            release_year=release_year,
        )
        elapsed = time.time() - start
        result["elapsed_seconds"] = round(elapsed, 1)
        result["status"] = "SUCCESS"
        logger.info("COMPLETED: %s in %.1fs -- %s", album_name, elapsed, result)
        return result
    except Exception as e:
        elapsed = time.time() - start
        logger.error(
            "FAILED: %s after %.1fs -- %s\n%s",
            album_name,
            elapsed,
            e,
            traceback.format_exc(),
        )
        return {
            "artist": ARTIST_NAME,
            "album": album_name,
            "status": "FAILED",
            "error": str(e),
            "elapsed_seconds": round(elapsed, 1),
        }


async def main():
    from app.db.qdrant import QdrantManager
    from app.ingestion.pipeline import IngestionPipeline

    # Ensure Qdrant collections exist
    print("Initializing Qdrant collections...")
    qm = QdrantManager()
    qm.initialize_collections()

    pipeline = IngestionPipeline()

    results = []

    for album_name, album_slug, release_year in ALBUMS:
        result = await ingest_one_album(pipeline, album_name, album_slug, release_year)
        results.append(result)
        # Small pause between albums to avoid Genius rate limits
        if result["status"] == "SUCCESS":
            logger.info("Pausing 3s before next album...")
            await asyncio.sleep(3)

    # Print summary
    print("\n" + "=" * 70)
    print("BATCH INGESTION SUMMARY")
    print("=" * 70)

    succeeded = 0
    failed = 0
    for r in results:
        status = r.get("status", "UNKNOWN")
        album = r.get("album", "?")
        if status == "SUCCESS":
            succeeded += 1
            songs = r.get("songs_created", 0)
            audio = r.get("audio_tracks_found", 0)
            genius = r.get("songs_from_genius", 0)
            elapsed = r.get("elapsed_seconds", 0)
            print(
                f"  [OK]   {album:20s} | {songs} songs | {audio} audio | {genius} genius | {elapsed:.0f}s"
            )
        else:
            failed += 1
            error = r.get("error", "unknown")
            print(f"  [FAIL] {album:20s} | {error}")

    print(f"\nTotal: {succeeded} succeeded, {failed} failed out of {len(results)}")

    # Write results to JSON for later inspection
    results_path = Path(__file__).resolve().parent / "batch_ingest_results.json"
    with open(results_path, "w") as f:
        json.dump(results, f, indent=2, default=str)
    print(f"Results written to {results_path}")


if __name__ == "__main__":
    asyncio.run(main())
