"""Reorganize downloaded audio files to match database metadata.

Reads songs from the database, fuzzy-matches them against downloaded files,
and moves files to the correct album folder with proper naming:
  data/audio/{artist_slug}/{album_slug}/{track_num} - {title}.mp3

Files that don't match any known song go to a 'singles/' or 'unmatched/' folder.

Usage:
    python ml/scripts/reorganize_audio.py [--dry-run]
"""

import argparse
import asyncio
import logging
import re
import shutil
import sys
from difflib import SequenceMatcher
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "backend"))

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)-7s %(message)s",
)
logger = logging.getLogger("reorg")


def normalize(text: str) -> str:
    """Normalize a string for fuzzy matching."""
    text = text.lower().strip()
    # Remove feat/ft/featuring and everything after
    text = re.sub(r"\s*[\(\[].*?[\)\]]", "", text)
    text = re.sub(r"\s*(feat\.?|ft\.?|featuring)\s+.*$", "", text, flags=re.IGNORECASE)
    # Remove common prefixes
    text = re.sub(r"^(seedhe\s*maut\s*[-–—x]\s*)", "", text, flags=re.IGNORECASE)
    text = re.sub(r"^(\d+\s*[-–—]\s*)", "", text)
    # Remove special chars
    text = re.sub(r"[^a-z0-9\s]", "", text)
    return text.strip()


def similarity(a: str, b: str) -> float:
    """Compute similarity between two strings."""
    na, nb = normalize(a), normalize(b)
    if na == nb:
        return 1.0
    if na in nb or nb in na:
        return 0.9
    return SequenceMatcher(None, na, nb).ratio()


async def reorganize(dry_run: bool = False):
    from sqlalchemy import select
    from sqlalchemy.orm import selectinload

    from app.config import settings
    from app.db.postgres import Album, Artist, Song, async_session

    audio_base = Path(settings.audio_base_path)
    artist_slug = "seedhe-maut"
    artist_dir = audio_base / artist_slug

    if not artist_dir.exists():
        logger.error("Audio directory not found: %s", artist_dir)
        return

    # Load all songs with album info from DB
    async with async_session() as session:
        result = await session.execute(
            select(Song)
            .join(Album)
            .join(Artist)
            .where(Artist.slug == artist_slug)
            .options(selectinload(Song.album))
            .order_by(Album.slug, Song.track_number)
        )
        songs = result.scalars().all()

    if not songs:
        logger.error("No songs in database. Run seed_discography.py first.")
        return

    logger.info("Found %d songs in database", len(songs))

    # Build lookup: (album_slug, title) -> Song
    song_lookup = []
    for song in songs:
        song_lookup.append({
            "song": song,
            "album_slug": song.album.slug,
            "album_title": song.album.title,
            "title": song.title,
            "track_number": song.track_number,
            "norm_title": normalize(song.title),
        })

    # Collect all audio files
    all_audio_files = []
    for mp3 in artist_dir.rglob("*.mp3"):
        all_audio_files.append(mp3)
    logger.info("Found %d audio files", len(all_audio_files))

    # Match files to songs
    matched = []
    unmatched_files = []

    for audio_file in all_audio_files:
        filename = audio_file.stem  # e.g. "1 - Nawazuddin"
        # Strip leading track number
        clean_name = re.sub(r"^\d+\s*[-–—]\s*", "", filename).strip()

        best_match = None
        best_score = 0.0

        for entry in song_lookup:
            score = similarity(clean_name, entry["title"])
            if score > best_score:
                best_score = score
                best_match = entry

        if best_match and best_score >= 0.6:
            matched.append({
                "file": audio_file,
                "song": best_match,
                "score": best_score,
            })
        else:
            unmatched_files.append((audio_file, best_match, best_score))

    # Report matches
    print(f"\n=== Matched: {len(matched)} files ===")
    for m in sorted(matched, key=lambda x: (x["song"]["album_slug"], x["song"]["track_number"])):
        s = m["song"]
        target_dir = artist_dir / s["album_slug"]
        pad = len(str(len([x for x in song_lookup if x["album_slug"] == s["album_slug"]])))
        target_name = f"{str(s['track_number']).zfill(pad)} - {s['title']}.mp3"
        target_path = target_dir / target_name

        status = "MOVE" if m["file"] != target_path else "OK"
        print(f"  [{m['score']:.0%}] {m['file'].name} -> {s['album_slug']}/{target_name}  ({status})")

        if not dry_run and status == "MOVE":
            target_dir.mkdir(parents=True, exist_ok=True)
            shutil.move(str(m["file"]), str(target_path))
            logger.info("Moved: %s -> %s", m["file"].name, target_path)

    print(f"\n=== Unmatched: {len(unmatched_files)} files ===")
    for f, best, score in unmatched_files:
        best_info = f" (closest: {best['title']} @ {score:.0%})" if best else ""
        print(f"  {f.relative_to(artist_dir)}{best_info}")

    # Move unmatched to 'unmatched/' folder
    if not dry_run and unmatched_files:
        unmatched_dir = artist_dir / "_unmatched"
        unmatched_dir.mkdir(exist_ok=True)
        for f, _, _ in unmatched_files:
            target = unmatched_dir / f.name
            if f.exists() and f != target:
                shutil.move(str(f), str(target))

    # Clean up empty directories
    if not dry_run:
        for d in artist_dir.iterdir():
            if d.is_dir() and not any(d.iterdir()):
                d.rmdir()
                logger.info("Removed empty dir: %s", d.name)

    print(f"\n{'DRY RUN - no files moved' if dry_run else 'Reorganization complete!'}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true", help="Show what would happen without moving files")
    args = parser.parse_args()
    asyncio.run(reorganize(dry_run=args.dry_run))
