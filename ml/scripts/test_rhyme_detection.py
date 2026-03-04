"""Test word-level rhyme detection on 5 sample songs.

Usage:
    cd /path/to/raag
    source .venv/bin/activate
    python ml/scripts/test_rhyme_detection.py
"""

import asyncio
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "backend"))

import asyncpg

from app.ml.nlp.rhyme_annotator import RhymeAnnotator

# 5 diverse test songs
TEST_SONGS = [
    "7d633ed8-05c3-477c-9dd4-47cb07b23e79",  # Naamcheen (2021)
    "f5511054-ad37-4fd2-ab11-7082cfa05d30",  # Nayaab (2022)
    "c0bafa41-138d-420a-b8e3-bff60513dc66",  # Toh Kya (2022)
    "0a4335dd-8c8b-4029-89dd-ae522b1b8fd3",  # Class-Sikh Maut (2017)
    "ae1ed6e7-19ba-4b57-b00e-a614d6416a16",  # Namastute (2021)
]

# ANSI color codes for terminal output
RHYME_COLORS = {
    "A": "\033[91m",  # Red
    "B": "\033[94m",  # Blue
    "C": "\033[92m",  # Green
    "D": "\033[93m",  # Yellow
    "E": "\033[95m",  # Magenta
    "F": "\033[96m",  # Cyan
    "G": "\033[33m",  # Dark yellow
    "H": "\033[35m",  # Dark magenta
    "I": "\033[36m",  # Dark cyan
    "J": "\033[31m",  # Dark red
}
RESET = "\033[0m"
BOLD = "\033[1m"
DIM = "\033[2m"


def render_bar_with_rhymes(text: str, rhyme_words: list[dict]) -> str:
    """Render a bar with color-coded rhyme words."""
    if not rhyme_words:
        return f"{DIM}{text}{RESET}"

    # Sort by start position
    sorted_words = sorted(rhyme_words, key=lambda w: w["start_char"])

    result = ""
    last_end = 0

    for rw in sorted_words:
        start = rw["start_char"]
        end = rw["end_char"]
        group = rw["group"]
        color = RHYME_COLORS.get(group, "\033[97m")

        # Add non-rhyming text before this word
        if start > last_end:
            result += f"{DIM}{text[last_end:start]}{RESET}"

        # Add colored rhyme word
        result += f"{color}{BOLD}{text[start:end]}{RESET}"
        last_end = end

    # Add remaining text
    if last_end < len(text):
        result += f"{DIM}{text[last_end:]}{RESET}"

    # Add group labels
    groups_used = sorted(set(rw["group"] for rw in rhyme_words))
    labels = " ".join(
        f"{RHYME_COLORS.get(g, '')}{g}{RESET}" for g in groups_used
    )
    result += f"  [{labels}]"

    return result


async def test_song(conn: asyncpg.Connection, song_id: str, annotator: RhymeAnnotator):
    """Test rhyme detection on a single song."""
    # Fetch song info
    song = await conn.fetchrow(
        "SELECT s.title, a.title as album FROM songs s JOIN albums a ON s.album_id = a.id WHERE s.id = $1",
        song_id,
    )
    if not song:
        print(f"Song {song_id} not found!")
        return

    # Fetch bars
    bars_rows = await conn.fetch(
        "SELECT text, bar_index, section, mc FROM bars WHERE song_id = $1 ORDER BY bar_index",
        song_id,
    )
    if not bars_rows:
        print(f"No bars found for {song['title']}!")
        return

    bar_texts = [r["text"] for r in bars_rows]

    print(f"\n{'='*80}")
    print(f"{BOLD}  {song['title']} — {song['album']}{RESET}")
    print(f"  {len(bar_texts)} bars")
    print(f"{'='*80}\n")

    # Run rhyme annotation (only first 30 bars for quick testing)
    test_bars = bar_texts[:30]
    print(f"  Annotating first {len(test_bars)} bars...")
    annotations = annotator.annotate_bars(song["title"], test_bars)

    # Display results
    current_section = None
    for i, ann in enumerate(annotations):
        bar_row = bars_rows[i]

        # Section header
        if bar_row["section"] != current_section:
            current_section = bar_row["section"]
            if current_section:
                mc_label = f" ({bar_row['mc']})" if bar_row["mc"] else ""
                print(f"\n  {BOLD}[{current_section}{mc_label}]{RESET}")

        # Render bar with rhymes
        rhyme_words = ann.get("rhyme_words", [])
        rendered = render_bar_with_rhymes(bar_row["text"], rhyme_words)
        idx = bar_row["bar_index"]
        print(f"  {DIM}{idx:3d}{RESET} │ {rendered}")

    # Stats
    total_rhyme_words = sum(len(a.get("rhyme_words", [])) for a in annotations)
    bars_with_rhymes = sum(1 for a in annotations if a.get("rhyme_words"))
    groups = set()
    for a in annotations:
        for rw in a.get("rhyme_words", []):
            groups.add(rw["group"])

    print(f"\n  {BOLD}Stats:{RESET}")
    print(f"    Bars with rhymes: {bars_with_rhymes}/{len(test_bars)}")
    print(f"    Total rhyme words: {total_rhyme_words}")
    print(f"    Rhyme groups: {len(groups)} ({', '.join(sorted(groups))})")

    # Validate offsets
    bad_offsets = 0
    for i, ann in enumerate(annotations):
        text = bar_texts[i]
        for rw in ann.get("rhyme_words", []):
            actual = text[rw["start_char"]:rw["end_char"]]
            if actual.lower() != rw["word"].lower():
                bad_offsets += 1
                print(f"    {BOLD}\033[91mBAD OFFSET:{RESET} bar {i}, "
                      f"expected '{rw['word']}' got '{actual}' "
                      f"({rw['start_char']}:{rw['end_char']})")

    if bad_offsets == 0:
        print(f"    {BOLD}\033[92mAll offsets valid!{RESET}")
    else:
        print(f"    {BOLD}\033[91m{bad_offsets} bad offsets{RESET}")

    return annotations


async def main():
    conn = await asyncpg.connect("postgresql://rahilsinghi@localhost:5432/raag")
    annotator = RhymeAnnotator()

    # Optionally test just one song
    if len(sys.argv) > 1:
        song_id = sys.argv[1]
        await test_song(conn, song_id, annotator)
    else:
        for song_id in TEST_SONGS:
            await test_song(conn, song_id, annotator)

    await conn.close()


if __name__ == "__main__":
    asyncio.run(main())
