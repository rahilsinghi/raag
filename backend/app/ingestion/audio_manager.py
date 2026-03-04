"""Manages local audio file discovery and metadata extraction."""

import logging
import re
from pathlib import Path

from app.config import settings

logger = logging.getLogger(__name__)

SUPPORTED_EXTENSIONS: set[str] = {".mp3", ".wav", ".flac", ".m4a"}

# Matches filenames like "01 - Track Name.mp3" or "01. Track Name.mp3"
TRACK_FILENAME_RE = re.compile(
    r"^(?P<number>\d+)\s*[-.)]\s*(?P<title>.+)$"
)


class AudioManager:
    """Discovers and sorts audio files from the local data directory."""

    def __init__(self, base_path: str | None = None) -> None:
        self.base_path = Path(base_path or settings.audio_base_path)

    def get_album_tracks(
        self, artist_slug: str, album_slug: str
    ) -> list[dict]:
        """List audio files for an album, sorted by track number.

        Looks in ``data/audio/{artist_slug}/{album_slug}/`` for supported
        audio files and extracts track numbers from filenames.

        Returns:
            Sorted list of dicts with keys: track_number, title, path
        """
        album_dir = self.base_path / artist_slug / album_slug

        if not album_dir.exists():
            logger.warning("Album directory not found: %s", album_dir)
            return []

        tracks: list[dict] = []

        for filepath in sorted(album_dir.iterdir()):
            if not filepath.is_file():
                continue
            if filepath.suffix.lower() not in SUPPORTED_EXTENSIONS:
                continue

            stem = filepath.stem
            match = TRACK_FILENAME_RE.match(stem)

            if match:
                track_number = int(match.group("number"))
                title = match.group("title").strip()
            else:
                # Fallback: no track number detected
                track_number = 0
                title = stem.strip()

            tracks.append({
                "track_number": track_number,
                "title": title,
                "path": str(filepath),
            })

        # Sort by track number, then by filename for stability
        tracks.sort(key=lambda t: (t["track_number"], t["title"]))
        logger.info(
            "Found %d audio tracks in %s/%s", len(tracks), artist_slug, album_slug
        )
        return tracks
