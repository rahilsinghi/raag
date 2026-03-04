"""CLI script to ingest Nayaab end-to-end."""

import asyncio
import logging
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "backend"))

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")


async def main():
    from app.db.qdrant import QdrantManager
    from app.ingestion.pipeline import IngestionPipeline

    # Initialize Qdrant collections
    print("Initializing Qdrant collections...")
    qm = QdrantManager()
    qm.initialize_collections()

    # Run ingestion
    print("Starting Nayaab ingestion...")
    pipeline = IngestionPipeline()
    result = await pipeline.ingest_album(
        artist_name="Seedhe Maut",
        artist_slug="seedhe-maut",
        album_name="Nayaab",
        album_slug="nayaab",
        release_year=2022,
    )

    print("\n=== Ingestion Complete ===")
    for key, value in result.items():
        print(f"  {key}: {value}")


if __name__ == "__main__":
    asyncio.run(main())
