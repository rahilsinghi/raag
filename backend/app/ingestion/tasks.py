"""Celery tasks for background ingestion jobs."""

import asyncio
import logging

from celery_app import celery

logger = logging.getLogger(__name__)


@celery.task(name="ingest_album", bind=True, max_retries=2)
def ingest_album_task(
    self,
    artist_name: str,
    artist_slug: str,
    album_name: str,
    album_slug: str,
    release_year: int | None = None,
) -> dict:
    """Celery task that runs the album ingestion pipeline.

    Since the pipeline is async, we run it inside an asyncio event loop.
    """
    from app.ingestion.pipeline import IngestionPipeline

    logger.info(
        "Celery task started: ingest_album(%s, %s)", artist_name, album_name
    )

    pipeline = IngestionPipeline()
    result = asyncio.run(
        pipeline.ingest_album(
            artist_name=artist_name,
            artist_slug=artist_slug,
            album_name=album_name,
            album_slug=album_slug,
            release_year=release_year,
        )
    )
    return result
