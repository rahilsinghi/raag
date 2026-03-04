"""Lyrics chunker: splits raw Genius lyrics into structured chunks."""

from __future__ import annotations

import re
from dataclasses import dataclass


# Canonical MC name mapping (lowercase key -> display name)
_MC_ALIASES: dict[str, str] = {
    "encore abj": "Encore",
    "encore": "Encore",
    "calm": "Calm",
    "seedhe maut": "Seedhe Maut",
    "seedhe maut 2": "Seedhe Maut",
    "sm": "Seedhe Maut",
}

# Regex for Genius section headers like [Verse 1: Encore ABJ] or [Hook]
_SECTION_HEADER_RE = re.compile(
    r"^\[(?P<section>[^\]:]+?)(?:\s*:\s*(?P<mc>[^\]]+))?\]\s*$"
)

# Lines that are Genius artifacts (contributor info, translation links, etc.)
_ARTIFACT_PATTERNS: list[re.Pattern[str]] = [
    re.compile(r"Contributors", re.IGNORECASE),
    re.compile(r"Translations", re.IGNORECASE),
    re.compile(r"^\d*\s*Lyrics$", re.IGNORECASE),
    re.compile(r"Lyrics$", re.IGNORECASE),
]


@dataclass
class LyricChunk:
    """A chunk of lyrics with metadata."""

    text: str
    chunk_type: str  # "full_song", "section", "bar"
    chunk_index: int
    section: str | None = None
    mc: str | None = None
    line_start: int | None = None
    line_end: int | None = None


def _normalize_mc(raw_mc: str) -> str:
    """Map a raw MC credit string to a canonical display name."""
    key = raw_mc.strip().lower()
    return _MC_ALIASES.get(key, raw_mc.strip())


def _clean_lyrics(raw_lyrics: str) -> str:
    """Remove Genius artefacts from raw lyrics text."""
    lines = raw_lyrics.split("\n")

    # Strip embed footer: drop everything from the first line containing "Embed"
    clean_lines: list[str] = []
    for line in lines:
        if re.search(r"Embed", line):
            break
        clean_lines.append(line)

    # Remove contributor / translation / "Lyrics" header lines
    filtered: list[str] = []
    for line in clean_lines:
        if any(pat.search(line) for pat in _ARTIFACT_PATTERNS):
            continue
        filtered.append(line)

    return "\n".join(filtered).strip()


class LyricsChunker:
    """Splits cleaned lyrics into full-song, section, and bar-level chunks."""

    def chunk_lyrics(self, raw_lyrics: str) -> list[LyricChunk]:
        """Produce three levels of chunks from raw Genius lyrics."""
        cleaned = _clean_lyrics(raw_lyrics)
        if not cleaned:
            return []

        chunks: list[LyricChunk] = []
        chunk_index = 0

        # ── Level 1: full_song ──────────────────────────────────────────
        chunks.append(
            LyricChunk(
                text=cleaned,
                chunk_type="full_song",
                chunk_index=chunk_index,
            )
        )
        chunk_index += 1

        # ── Parse sections ──────────────────────────────────────────────
        lines = cleaned.split("\n")
        sections: list[dict[str, object]] = []
        current_section: str | None = None
        current_mc: str | None = None
        current_lines: list[str] = []
        current_start: int | None = None

        for line_idx, line in enumerate(lines):
            header_match = _SECTION_HEADER_RE.match(line)
            if header_match:
                # Flush previous section
                if current_lines:
                    sections.append(
                        {
                            "section": current_section,
                            "mc": current_mc,
                            "lines": current_lines,
                            "line_start": current_start,
                            "line_end": line_idx - 1,
                        }
                    )
                current_section = header_match.group("section").strip()
                mc_raw = header_match.group("mc")
                current_mc = _normalize_mc(mc_raw) if mc_raw else None
                current_lines = []
                current_start = line_idx + 1
            else:
                if line.strip():
                    if current_start is None:
                        current_start = line_idx
                    current_lines.append(line)

        # Flush last section
        if current_lines:
            sections.append(
                {
                    "section": current_section,
                    "mc": current_mc,
                    "lines": current_lines,
                    "line_start": current_start,
                    "line_end": len(lines) - 1,
                }
            )

        # ── Level 2: section chunks ─────────────────────────────────────
        for sec in sections:
            section_text = "\n".join(sec["lines"])  # type: ignore[arg-type]
            if not section_text.strip():
                continue
            chunks.append(
                LyricChunk(
                    text=section_text,
                    chunk_type="section",
                    chunk_index=chunk_index,
                    section=sec["section"],  # type: ignore[arg-type]
                    mc=sec["mc"],  # type: ignore[arg-type]
                    line_start=sec["line_start"],  # type: ignore[arg-type]
                    line_end=sec["line_end"],  # type: ignore[arg-type]
                )
            )
            chunk_index += 1

        # ── Level 3: bar (individual line) chunks ───────────────────────
        for sec in sections:
            sec_name: str | None = sec["section"]  # type: ignore[assignment]
            sec_mc: str | None = sec["mc"]  # type: ignore[assignment]
            line_offset: int = sec["line_start"]  # type: ignore[assignment]

            for i, bar in enumerate(sec["lines"]):  # type: ignore[union-attr]
                bar_text: str = bar  # type: ignore[assignment]
                if not bar_text.strip():
                    continue
                chunks.append(
                    LyricChunk(
                        text=bar_text,
                        chunk_type="bar",
                        chunk_index=chunk_index,
                        section=sec_name,
                        mc=sec_mc,
                        line_start=line_offset + i,
                        line_end=line_offset + i,
                    )
                )
                chunk_index += 1

        return chunks
