"""FastAPI router for album ingestion endpoints."""

import asyncio
import logging

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.ingestion.pipeline import IngestionPipeline
from app.ingestion.youtube_downloader import download_album_audio

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/ingest", tags=["ingestion"])


class IngestAlbumRequest(BaseModel):
    """Request body for the album ingestion endpoint."""

    artist_name: str
    artist_slug: str
    album_name: str
    album_slug: str
    release_year: int | None = None


class IngestAlbumResponse(BaseModel):
    """Response body for the album ingestion endpoint."""

    status: str
    summary: dict


@router.post("/album", response_model=IngestAlbumResponse)
async def ingest_album(request: IngestAlbumRequest) -> IngestAlbumResponse:
    """Ingest an album: fetch lyrics, match audio, and create DB records.

    Phase 1: runs synchronously (inline async).
    Future: will dispatch to a Celery task and return a task_id.
    """
    pipeline = IngestionPipeline()

    try:
        summary = await pipeline.ingest_album(
            artist_name=request.artist_name,
            artist_slug=request.artist_slug,
            album_name=request.album_name,
            album_slug=request.album_slug,
            release_year=request.release_year,
        )
    except Exception as exc:
        logger.exception("Ingestion failed for %s - %s", request.artist_name, request.album_name)
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return IngestAlbumResponse(status="completed", summary=summary)


class DownloadAudioRequest(BaseModel):
    url: str
    artist_slug: str
    album_slug: str


class DownloadAudioResponse(BaseModel):
    status: str
    summary: dict


@router.post("/download-audio", response_model=DownloadAudioResponse)
async def download_audio(request: DownloadAudioRequest) -> DownloadAudioResponse:
    """Download audio from YouTube URL and save to the audio directory."""
    try:
        summary = await asyncio.to_thread(
            download_album_audio,
            url=request.url,
            artist_slug=request.artist_slug,
            album_slug=request.album_slug,
        )
    except Exception as exc:
        logger.exception("Download failed for %s", request.url)
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return DownloadAudioResponse(status="completed", summary=summary)


class DownloadAndIngestRequest(BaseModel):
    url: str
    artist_name: str
    artist_slug: str
    album_name: str
    album_slug: str
    release_year: int | None = None


@router.post("/download-and-ingest", response_model=IngestAlbumResponse)
async def download_and_ingest(request: DownloadAndIngestRequest) -> IngestAlbumResponse:
    """Download audio from YouTube, then run the full ingestion pipeline."""
    # Step 1: Download
    try:
        dl_summary = await asyncio.to_thread(
            download_album_audio,
            url=request.url,
            artist_slug=request.artist_slug,
            album_slug=request.album_slug,
        )
        logger.info("Downloaded %d tracks", dl_summary["download_count"])
    except Exception as exc:
        logger.exception("Download failed for %s", request.url)
        raise HTTPException(status_code=500, detail=f"Download failed: {exc}") from exc

    # Step 2: Ingest
    pipeline = IngestionPipeline()
    try:
        summary = await pipeline.ingest_album(
            artist_name=request.artist_name,
            artist_slug=request.artist_slug,
            album_name=request.album_name,
            album_slug=request.album_slug,
            release_year=request.release_year,
        )
        summary["download"] = dl_summary
    except Exception as exc:
        logger.exception("Ingestion failed after download")
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return IngestAlbumResponse(status="completed", summary=summary)
