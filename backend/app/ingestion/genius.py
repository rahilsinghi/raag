"""Genius API client for fetching and parsing song lyrics."""

import logging
import re

import lyricsgenius

from app.config import settings

logger = logging.getLogger(__name__)

# Mapping of raw Genius MC names (lowercased) to canonical display names.
# Extend this as new artists are ingested.
MC_NAME_MAP: dict[str, str] = {
    "encore abj": "Encore",
    "encore": "Encore",
    "calm": "Calm",
    "epigram": "Epigram",
    "rawal": "Rawal",
    "seedhe maut": "Seedhe Maut",
}

# Regex for section headers like [Verse 1: Encore ABJ], [Hook: Calm], [Bridge]
SECTION_HEADER_RE = re.compile(
    r"\[(?P<type>[A-Za-z\- ]+?)(?:\s*(?P<number>\d+))?"
    r"(?:\s*:\s*(?P<mc>[^\]]+))?\]"
)


class GeniusClient:
    """Wraps the lyricsgenius library with section-aware parsing."""

    def __init__(self, access_token: str | None = None) -> None:
        token = access_token or settings.genius_access_token
        self.genius = lyricsgenius.Genius(
            token,
            remove_section_headers=False,
            verbose=False,
            retries=3,
        )

    def fetch_album_songs(self, artist_name: str, album_name: str) -> list[dict]:
        """Fetch all songs from an album via Genius and return parsed dicts."""
        logger.info("Fetching album '%s' by '%s' from Genius", album_name, artist_name)

        artist = self.genius.search_artist(artist_name, max_songs=0)
        if artist is None:
            logger.warning("Artist '%s' not found on Genius", artist_name)
            return []

        album = self.genius.search_album(album_name, artist.name)
        if album is None:
            logger.warning("Album '%s' not found on Genius", album_name)
            return []

        songs: list[dict] = []
        for track in album.tracks:
            # lyricsgenius returns tracks as (track_number, Song) tuples
            if isinstance(track, tuple):
                track_number, song = track
            else:
                song = track
                track_number = None
            if song is not None:
                parsed = self._parse_song(song)
                if track_number is not None:
                    parsed["track_number"] = track_number
                songs.append(parsed)

        logger.info("Fetched %d songs from '%s'", len(songs), album_name)
        return songs

    def _parse_song(self, song: lyricsgenius.types.Song) -> dict:
        """Extract structured data from a Genius Song object."""
        raw_lyrics = song.lyrics or ""
        sections = self._parse_sections(raw_lyrics)
        body = song._body if hasattr(song, "_body") else {}

        return {
            "title": song.title,
            "lyrics": raw_lyrics,
            "genius_id": body.get("id"),
            "genius_url": song.url,
            "sections": sections,
        }

    def _parse_sections(self, raw_lyrics: str) -> list[dict]:
        """Parse section headers and their lines from raw lyrics text.

        Returns a list of dicts, each with:
            - section_type: e.g. "Verse", "Hook", "Bridge"
            - section_number: int or None
            - mc: canonical MC name or None
            - lines: list of lyric lines belonging to this section
        """
        sections: list[dict] = []
        current_section: dict | None = None

        for line in raw_lyrics.split("\n"):
            header_match = SECTION_HEADER_RE.match(line.strip())
            if header_match:
                # Save the previous section if it exists
                if current_section is not None:
                    sections.append(current_section)

                section_type = header_match.group("type").strip().title()
                number_str = header_match.group("number")
                mc_raw = header_match.group("mc")

                mc: str | None = None
                if mc_raw:
                    mc_key = mc_raw.strip().lower()
                    mc = MC_NAME_MAP.get(mc_key, mc_raw.strip())

                current_section = {
                    "section_type": section_type,
                    "section_number": int(number_str) if number_str else None,
                    "mc": mc,
                    "lines": [],
                }
            elif current_section is not None:
                stripped = line.strip()
                if stripped:
                    current_section["lines"].append(stripped)

        # Append final section
        if current_section is not None:
            sections.append(current_section)

        return sections
