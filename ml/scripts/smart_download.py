"""Smart audio downloader that uses DB metadata to find exact tracks.

For each song in the database that doesn't have a local audio file,
searches YouTube for "Artist - Title" and downloads the best match.

Usage:
    python ml/scripts/smart_download.py [--album SLUG] [--dry-run] [--limit N]
"""

import argparse
import asyncio
import logging
import re
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "backend"))

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)-7s %(message)s",
)
logger = logging.getLogger("smart_dl")


def slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_]+", "-", text)
    return re.sub(r"-+", "-", text).strip("-")


async def smart_download(album_slug: str | None, dry_run: bool, limit: int | None):
    from sqlalchemy import select
    from sqlalchemy.orm import selectinload

    from app.config import settings
    from app.db.postgres import Album, Artist, Song, async_session
    from app.ingestion.youtube_downloader import search_youtube

    import yt_dlp

    audio_base = Path(settings.audio_base_path)
    artist_slug = "seedhe-maut"

    # Load songs needing audio
    async with async_session() as session:
        query = (
            select(Song)
            .join(Album)
            .join(Artist)
            .where(Artist.slug == artist_slug)
            .options(selectinload(Song.album))
            .order_by(Album.release_year, Song.track_number)
        )
        if album_slug:
            query = query.where(Album.slug == album_slug)

        result = await session.execute(query)
        songs = result.scalars().all()

    # Filter to songs without audio files
    needs_download = []
    for song in songs:
        album_dir = audio_base / artist_slug / song.album.slug
        total_tracks = len([s for s in songs if s.album_id == song.album_id])
        pad = len(str(total_tracks))
        expected_path = album_dir / f"{str(song.track_number).zfill(pad)} - {song.title}.mp3"

        if not expected_path.exists():
            needs_download.append({
                "song": song,
                "album_slug": song.album.slug,
                "album_title": song.album.title,
                "expected_path": expected_path,
                "pad": pad,
            })

    logger.info(
        "Found %d songs total, %d need download",
        len(songs),
        len(needs_download),
    )

    if limit:
        needs_download = needs_download[:limit]

    if dry_run:
        print(f"\n=== Would download {len(needs_download)} tracks ===")
        for entry in needs_download:
            s = entry["song"]
            print(f"  [{entry['album_slug']}] {s.track_number}. {s.title}")
        return

    # Download each track
    downloaded = 0
    failed = 0

    for entry in needs_download:
        song = entry["song"]
        query = f"Seedhe Maut {song.title} official audio"

        # Skip skits
        if "skit" in song.title.lower():
            logger.info("Skipping skit: %s", song.title)
            continue

        logger.info(
            "Searching: %s - %s [%s]",
            entry["album_title"],
            song.title,
            query,
        )

        try:
            results = search_youtube(query, max_results=5)
            if not results:
                logger.warning("No YouTube results for: %s", song.title)
                failed += 1
                continue

            # Pick best result: prefer shorter videos (single track, not full album)
            best = None
            for r in results:
                dur = r.get("duration") or 0
                title_lower = r["title"].lower()
                song_lower = song.title.lower()

                # Skip full albums / playlists
                if dur > 600:
                    continue
                # Prefer results that contain the song title
                if song_lower in title_lower or any(
                    w in title_lower for w in song_lower.split() if len(w) > 3
                ):
                    best = r
                    break

            if not best and results:
                # Fallback: shortest video that's > 30 seconds
                candidates = [r for r in results if (r.get("duration") or 0) > 30]
                if candidates:
                    best = min(candidates, key=lambda r: r.get("duration") or 9999)

            if not best:
                logger.warning("No suitable result for: %s", song.title)
                failed += 1
                continue

            # Download
            output_dir = entry["expected_path"].parent
            output_dir.mkdir(parents=True, exist_ok=True)
            output_path = str(entry["expected_path"]).removesuffix(".mp3")

            dl_opts = {
                "format": "bestaudio/best",
                "postprocessors": [
                    {
                        "key": "FFmpegExtractAudio",
                        "preferredcodec": "mp3",
                        "preferredquality": "320",
                    }
                ],
                "outtmpl": output_path,
                "quiet": True,
                "no_warnings": True,
            }

            with yt_dlp.YoutubeDL(dl_opts) as ydl:
                ydl.download([best["url"]])

            logger.info(
                "Downloaded: [%s] %02d - %s (%s)",
                entry["album_slug"],
                song.track_number,
                song.title,
                best["title"][:50],
            )
            downloaded += 1

        except Exception as e:
            logger.error("Failed to download %s: %s", song.title, e)
            failed += 1

        # Rate limit
        time.sleep(1)

    print(f"\n=== Download Summary ===")
    print(f"  Downloaded: {downloaded}")
    print(f"  Failed: {failed}")
    print(f"  Skipped: {len(needs_download) - downloaded - failed}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--album", type=str, help="Only download for this album slug")
    parser.add_argument("--dry-run", action="store_true", help="Show what would be downloaded")
    parser.add_argument("--limit", type=int, help="Max tracks to download")
    args = parser.parse_args()
    asyncio.run(smart_download(args.album, args.dry_run, args.limit))
