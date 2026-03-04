from __future__ import annotations

import json
import logging
import re

import anthropic

from app.config import settings

logger = logging.getLogger(__name__)

RHYME_ANNOTATION_PROMPT = """You are a phonetic rhyme analysis tool for a personal music library. Analyze rhyme patterns at the WORD level in these rap bars.

Artist: Seedhe Maut (duo: Encore ABJ and Calm)
Song: "{title}"
Bars (numbered):
{numbered_bars}

For each bar, identify which specific words or word-endings RHYME with words in OTHER bars. Assign each rhyming sound a group letter (A, B, C...).

Rules:
- A rhyme group connects words across bars that share the same vowel sound pattern
- Include end rhymes (last word/syllable of a line rhyming with another line's end)
- Include internal rhymes (words mid-line that rhyme with words in other lines)
- Include multi-syllabic rhymes (e.g., "duniya" / "guniya" — multiple syllables match)
- Include slant/near rhymes if the vowel pattern is close enough for rap delivery
- Hindi and English words CAN rhyme with each other if vowel sounds match (e.g., "game" / "naam")
- For Devanagari text, base rhyme detection on the actual pronunciation/vowel sounds
- Only mark words that genuinely rhyme — don't force every word into a group
- A group needs at least 2 words across bars to be valid
- Provide character offsets (start_char, end_char) based on the bar text (0-indexed, end exclusive)

Return ONLY a JSON object:
{{"bars": [
  {{
    "bar_index": 0,
    "rhyme_words": [
      {{"word": "game", "start_char": 15, "end_char": 19, "group": "A"}}
    ]
  }}
]}}

IMPORTANT:
- start_char and end_char must be exact character positions in the bar text
- end_char is exclusive (like Python slicing)
- If a bar has no rhyming words, return empty rhyme_words array
- Return ALL bars, even those with no rhymes"""


class RhymeAnnotator:
    def __init__(self):
        self.client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

    def annotate_bars(self, title: str, bars: list[str]) -> list[dict]:
        """Annotate bars with word-level rhyme groups."""
        batch_size = 50
        if len(bars) > batch_size:
            all_annotations: list[dict] = []
            for start in range(0, len(bars), batch_size):
                batch = bars[start : start + batch_size]
                batch_result = self._annotate_batch(title, batch, offset=start)
                all_annotations.extend(batch_result)
            return all_annotations

        return self._annotate_batch(title, bars, offset=0)

    def _annotate_batch(
        self, title: str, bars: list[str], offset: int = 0
    ) -> list[dict]:
        """Send a batch to Claude for rhyme analysis."""
        numbered = "\n".join(f"{i + offset}: {bar}" for i, bar in enumerate(bars))
        prompt = RHYME_ANNOTATION_PROMPT.format(title=title, numbered_bars=numbered)

        try:
            response = self.client.messages.create(
                model=settings.claude_model,
                max_tokens=8192,
                messages=[{"role": "user", "content": prompt}],
            )

            raw = ""
            for block in response.content:
                if hasattr(block, "text"):
                    raw = block.text
                    break

            if not raw.strip():
                logger.error(
                    "Empty response from Claude for rhyme annotation '%s' (bars %d-%d)",
                    title, offset, offset + len(bars) - 1,
                )
                return self._empty_annotations(bars, offset)

            result = self._extract_json(raw)
            if result is None:
                logger.error(
                    "Failed to extract JSON for rhyme annotation '%s' (bars %d-%d). "
                    "Raw (first 500): %s",
                    title, offset, offset + len(bars) - 1, raw[:500],
                )
                return self._empty_annotations(bars, offset)

            annotations = result.get("bars", [])

            # Validate and fix char offsets
            for ann in annotations:
                bar_idx = ann.get("bar_index", 0) - offset
                if 0 <= bar_idx < len(bars):
                    bar_text = bars[bar_idx]
                    validated_words = []
                    for rw in ann.get("rhyme_words", []):
                        start = rw.get("start_char", 0)
                        end = rw.get("end_char", 0)
                        word = rw.get("word", "")
                        group = rw.get("group", "")

                        # If offsets are wrong, try to find the word in the text
                        if bar_text[start:end].lower() != word.lower():
                            idx = bar_text.lower().find(word.lower())
                            if idx >= 0:
                                start = idx
                                end = idx + len(word)
                            else:
                                continue  # Skip if word not found

                        validated_words.append({
                            "word": word,
                            "start_char": start,
                            "end_char": end,
                            "group": group,
                        })
                    ann["rhyme_words"] = validated_words

            return annotations

        except anthropic.APIError as e:
            logger.error("Anthropic API error during rhyme annotation: %s", e)
            return self._empty_annotations(bars, offset)

    def _extract_json(self, raw: str) -> dict | None:
        """Extract JSON from Claude response."""
        text = raw.strip()

        try:
            return json.loads(text)
        except json.JSONDecodeError:
            pass

        code_match = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
        if code_match:
            try:
                return json.loads(code_match.group(1).strip())
            except json.JSONDecodeError:
                pass

        first_brace = text.find("{")
        last_brace = text.rfind("}")
        if first_brace != -1 and last_brace > first_brace:
            try:
                return json.loads(text[first_brace : last_brace + 1])
            except json.JSONDecodeError:
                pass

        return None

    @staticmethod
    def _empty_annotations(bars: list[str], offset: int = 0) -> list[dict]:
        return [
            {"bar_index": i + offset, "rhyme_words": []}
            for i in range(len(bars))
        ]
