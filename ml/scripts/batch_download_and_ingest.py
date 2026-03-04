"""Batch download audio and ingest full Seedhe Maut discography.

Downloads audio from YouTube, fetches lyrics from Genius, runs full ML
pipeline (CLAP, lyrics embeddings, NLP) for each album.

Usage:
    python ml/scripts/batch_download_and_ingest.py [--download-only] [--ingest-only] [--album SLUG]
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
    format="%(asctime)s %(levelname)-7s %(name)s: %(message)s",
)
logger = logging.getLogger("batch")

# ── Seedhe Maut Discography ─────────────────────────────────────────
DISCOGRAPHY = [
    {
        "artist_name": "Seedhe Maut",
        "artist_slug": "seedhe-maut",
        "album_name": "Bayaan",
        "album_slug": "bayaan",
        "release_year": 2018,
    },
    {
        "artist_name": "Seedhe Maut",
        "artist_slug": "seedhe-maut",
        "album_name": "n",
        "album_slug": "n",
        "release_year": 2020,
    },
    {
        "artist_name": "Seedhe Maut",
        "artist_slug": "seedhe-maut",
        "album_name": "Nayaab",
        "album_slug": "nayaab",
        "release_year": 2022,
    },
    {
        "artist_name": "Seedhe Maut",
        "artist_slug": "seedhe-maut",
        "album_name": "Lunch Break",
        "album_slug": "lunch-break",
        "release_year": 2023,
    },
    {
        "artist_name": "Seedhe Maut",
        "artist_slug": "seedhe-maut",
        "album_name": "Na",
        "album_slug": "na",
        "release_year": 2024,
    },
]


def download_album(album: dict) -> dict:
    """Download audio for one album from YouTube."""
    from app.ingestion.youtube_downloader import search_and_download_album

    logger.info(
        "═══ Downloading: %s - %s ═══",
        album["artist_name"],
        album["album_name"],
    )

    result = search_and_download_album(
        artist_name=album["artist_name"],
        album_name=album["album_name"],
        artist_slug=album["artist_slug"],
        album_slug=album["album_slug"],
    )
    logger.info(
        "Download result for %s: %d tracks",
        album["album_name"],
        result.get("download_count", 0),
    )
    return result


async def ingest_album(album: dict) -> dict:
    """Run full ingestion pipeline for one album."""
    from app.ingestion.pipeline import IngestionPipeline

    logger.info(
        "═══ Ingesting: %s - %s ═══",
        album["artist_name"],
        album["album_name"],
    )

    pipeline = IngestionPipeline()
    result = await pipeline.ingest_album(
        artist_name=album["artist_name"],
        artist_slug=album["artist_slug"],
        album_name=album["album_name"],
        album_slug=album["album_slug"],
        release_year=album.get("release_year"),
    )
    logger.info("Ingestion result for %s: %s", album["album_name"], result)
    return result


def download_all(albums: list[dict]) -> None:
    """Download audio for all albums sequentially."""
    results = []
    for album in albums:
        try:
            result = download_album(album)
            results.append(
                {
                    "album": album["album_name"],
                    "tracks": result.get("download_count", 0),
                    "status": "ok",
                }
            )
        except Exception as e:
            logger.error("Download failed for %s: %s", album["album_name"], e)
            results.append(
                {"album": album["album_name"], "tracks": 0, "status": f"error: {e}"}
            )
        # Brief pause between albums
        time.sleep(2)

    print("\n═══ Download Summary ═══")
    total = 0
    for r in results:
        print(f"  {r['album']}: {r['tracks']} tracks ({r['status']})")
        total += r["tracks"]
    print(f"  Total: {total} tracks")


async def ingest_all(albums: list[dict]) -> None:
    """Ingest all albums sequentially."""
    from app.db.qdrant import QdrantManager

    # Ensure Qdrant collections exist
    qm = QdrantManager()
    qm.initialize_collections()

    results = []
    for album in albums:
        try:
            result = await ingest_album(album)
            results.append(
                {
                    "album": album["album_name"],
                    "songs": result.get("songs_created", 0),
                    "status": "ok",
                }
            )
        except Exception as e:
            logger.error("Ingestion failed for %s: %s", album["album_name"], e)
            results.append(
                {"album": album["album_name"], "songs": 0, "status": f"error: {e}"}
            )

    print("\n═══ Ingestion Summary ═══")
    total = 0
    for r in results:
        print(f"  {r['album']}: {r['songs']} songs ({r['status']})")
        total += r["songs"]
    print(f"  Total: {total} songs")


def main():
    parser = argparse.ArgumentParser(description="Batch download and ingest discography")
    parser.add_argument("--download-only", action="store_true", help="Only download audio, skip ingestion")
    parser.add_argument("--ingest-only", action="store_true", help="Only run ingestion (audio must exist)")
    parser.add_argument("--album", type=str, help="Process only this album slug (e.g. 'bayaan')")
    parser.add_argument("--skip", type=str, help="Comma-separated album slugs to skip (e.g. 'nayaab')")
    args = parser.parse_args()

    albums = DISCOGRAPHY

    # Filter to specific album
    if args.album:
        albums = [a for a in albums if a["album_slug"] == args.album]
        if not albums:
            print(f"Unknown album slug: {args.album}")
            print(f"Available: {', '.join(a['album_slug'] for a in DISCOGRAPHY)}")
            sys.exit(1)

    # Skip specified albums
    if args.skip:
        skip_slugs = set(args.skip.split(","))
        albums = [a for a in albums if a["album_slug"] not in skip_slugs]

    print(f"Processing {len(albums)} album(s): {', '.join(a['album_name'] for a in albums)}")

    if not args.ingest_only:
        download_all(albums)

    if not args.download_only:
        asyncio.run(ingest_all(albums))


if __name__ == "__main__":
    main()
