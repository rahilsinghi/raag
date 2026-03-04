"""Download audio from YouTube videos/playlists using yt-dlp.

Supports direct URLs and search queries via yt-dlp's built-in ytsearch.
"""

import logging
import re
from pathlib import Path

import yt_dlp

from app.config import settings

logger = logging.getLogger(__name__)


def slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_]+", "-", text)
    return re.sub(r"-+", "-", text).strip("-")


def _clean_track_title(title: str) -> str:
    """Clean a YouTube video title into a usable track name.

    Handles patterns like:
      'Nayaab' (Official Lyric Video) | Seedhe Maut x Sez on the Beat | Nayaab
      Seedhe Maut - Nayaab (Official Audio) [Prod. Sez on the Beat]
    """
    # Strip everything after | or // (channel/album info)
    title = re.split(r"\s*[|/]{1,2}\s*", title)[0].strip()

    # Remove parenthetical/bracketed tags
    title = re.sub(
        r"\s*[\(\[](official\s*(audio|video|music\s*video|lyric\s*video|visualizer)|"
        r"audio|video|visuali[sz]er|lyric\s*video|prod\.?[^\)\]]*|feat\.?[^\)\]]*)[\)\]]",
        "",
        title,
        flags=re.IGNORECASE,
    ).strip()

    # Remove leading "Artist - " or "Artist x Producer - " patterns
    title = re.sub(
        r"^(?:seedhe\s*maut|encore|calm|sez\s*on\s*the\s*beat)(?:\s*(?:x|×|ft\.?|feat\.?)\s*\w[\w\s]*?)*\s*[-–—]\s*",
        "",
        title,
        flags=re.IGNORECASE,
    ).strip()

    # Remove wrapping quotes
    title = re.sub(r"^['\"""'']+|['\"""'']+$", "", title).strip()

    # Remove illegal filename chars
    title = re.sub(r"[<>:\"/\\|?*]", "", title).strip()

    return title or "Untitled"


def search_youtube(query: str, max_results: int = 5) -> list[dict]:
    """Search YouTube and return video metadata without downloading.

    Args:
        query: Search query string (e.g. "Seedhe Maut Nayaab full album")
        max_results: Maximum number of results to return

    Returns:
        List of dicts with: title, url, duration, channel, view_count
    """
    opts = {
        "quiet": True,
        "no_warnings": True,
        "extract_flat": True,
        "default_search": "ytsearch",
    }

    with yt_dlp.YoutubeDL(opts) as ydl:
        info = ydl.extract_info(f"ytsearch{max_results}:{query}", download=False)

    results = []
    for entry in info.get("entries", []):
        results.append({
            "title": entry.get("title", ""),
            "url": entry.get("url") or f"https://youtube.com/watch?v={entry.get('id', '')}",
            "duration": entry.get("duration"),
            "channel": entry.get("channel") or entry.get("uploader", ""),
            "view_count": entry.get("view_count"),
        })
    return results


def search_and_download_album(
    artist_name: str,
    album_name: str,
    artist_slug: str,
    album_slug: str,
) -> dict:
    """Search YouTube for an album, pick the best result, and download.

    Searches for "<artist> <album> full album" first (prefers playlists/long videos),
    then falls back to individual track search if needed.

    Returns:
        Summary dict with download_count, output_dir, search_query, and track list.
    """
    # Strategy 1: Search for full album (playlist or long video)
    query = f"{artist_name} {album_name} full album"
    logger.info("Searching YouTube: %s", query)
    results = search_youtube(query, max_results=5)

    # Prefer playlist or video > 10 min (likely full album)
    best = None
    for r in results:
        dur = r.get("duration") or 0
        if dur > 600:  # > 10 minutes
            best = r
            break

    if not best and results:
        best = results[0]

    if not best:
        return {"error": f"No YouTube results for: {query}", "search_query": query}

    logger.info("Selected: %s (%s)", best["title"], best["url"])
    summary = download_album_audio(best["url"], artist_slug, album_slug)
    summary["search_query"] = query
    summary["selected_video"] = best["title"]

    # Strategy 2: If only 1 track downloaded, try individual track search
    if summary["download_count"] <= 1:
        logger.info("Only 1 track found, searching for individual tracks...")
        track_query = f"{artist_name} {album_name}"
        track_results = search_youtube(track_query, max_results=15)

        # Filter to likely album tracks (by same channel, reasonable duration)
        channel = best.get("channel", "")
        album_lower = album_name.lower()
        artist_lower = artist_name.lower()

        track_urls = []
        for r in track_results:
            dur = r.get("duration") or 0
            title_lower = r["title"].lower()
            if 60 < dur < 600 and (artist_lower in title_lower or album_lower in title_lower):
                track_urls.append(r)

        if track_urls:
            # Download each track individually
            output_dir = Path(settings.audio_base_path) / artist_slug / album_slug
            existing = {f.name for f in output_dir.iterdir()} if output_dir.exists() else set()
            new_downloads = 0

            for idx, track in enumerate(track_urls, start=summary["download_count"] + 1):
                single = download_album_audio(track["url"], artist_slug, album_slug)
                new_downloads += single["download_count"]

            summary["download_count"] += new_downloads
            summary["fallback_strategy"] = "individual_track_search"

    return summary


def download_album_audio(
    url: str,
    artist_slug: str,
    album_slug: str,
) -> dict:
    """Download audio from a YouTube URL (single video or playlist).

    Files are saved to data/audio/{artist_slug}/{album_slug}/ as
    numbered MP3s: '01 - Title.mp3', '02 - Title.mp3', etc.

    Returns:
        Summary dict with download_count, output_dir, and track list.
    """
    output_dir = Path(settings.audio_base_path) / artist_slug / album_slug
    output_dir.mkdir(parents=True, exist_ok=True)

    # First pass: extract info to get track count and titles
    info_opts = {"quiet": True, "extract_flat": "in_playlist", "no_warnings": True}
    with yt_dlp.YoutubeDL(info_opts) as ydl:
        info = ydl.extract_info(url, download=False)

    # Determine if playlist or single video
    entries = info.get("entries", [info]) if info.get("entries") is not None else [info]
    total = len(entries)
    pad = len(str(total))

    downloaded = []

    for i, entry in enumerate(entries, start=1):
        video_url = entry.get("url") or entry.get("webpage_url") or url
        title = entry.get("title", f"Track {i}")
        clean_title = _clean_track_title(title)

        filename = f"{str(i).zfill(pad)} - {clean_title}"
        output_path = str(output_dir / filename)

        # Check if already downloaded
        if (output_dir / f"{filename}.mp3").exists():
            logger.info("Already exists, skipping: %s", filename)
            downloaded.append({
                "track_number": i,
                "title": clean_title,
                "path": f"{output_path}.mp3",
            })
            continue

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

        try:
            with yt_dlp.YoutubeDL(dl_opts) as ydl:
                ydl.download([video_url])
            logger.info("Downloaded: %s", filename)
            downloaded.append({
                "track_number": i,
                "title": clean_title,
                "path": f"{output_path}.mp3",
            })
        except Exception as e:
            logger.error("Failed to download '%s': %s", title, e)
            downloaded.append({
                "track_number": i,
                "title": clean_title,
                "path": None,
                "error": str(e),
            })

    summary = {
        "output_dir": str(output_dir),
        "total_expected": total,
        "download_count": sum(1 for d in downloaded if d.get("path")),
        "tracks": downloaded,
    }
    logger.info("Download complete: %d/%d tracks", summary["download_count"], total)
    return summary
