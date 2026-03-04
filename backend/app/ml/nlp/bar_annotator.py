from __future__ import annotations

import json
import logging
import re

import anthropic

from app.config import settings

logger = logging.getLogger(__name__)

BAR_ANNOTATION_PROMPT = """You are a lyrics analysis tool in a personal music library application. The user owns this music and has already stored these lyrics locally. Your job is to annotate each bar with metadata tags for the user's personal database. This is analytical annotation, not reproduction.

Artist: Seedhe Maut (duo: Encore ABJ and Calm)
Song: "{title}"
Bars (numbered):
{numbered_bars}

For each bar, return an object with:
- "bar_index": the bar number (0-indexed)
- "annotations": list of applicable tags from: ["punchline", "callback", "cultural_reference", "wordplay", "flow_switch", "key_bar"]
- "punchline_explanation": if "punchline" in annotations, explain the punchline (null otherwise)
- "reference_target": if "callback" or "cultural_reference", what it references (null otherwise)
- "rhyme_group": assign a letter (A, B, C...) grouping bars that rhyme together

IMPORTANT: Return ONLY a JSON object with this exact structure, no other text:
{{"bars": [...]}}

Rules:
- "punchline": a clever or impactful bar with double meaning, metaphor, or hard-hitting delivery
- "callback": references another Seedhe Maut song or earlier in this song
- "cultural_reference": references Indian culture, Bollywood, mythology, brands, etc.
- "wordplay": bilingual wordplay, homophones, or clever Hindi-English mixing
- "flow_switch": noticeable change in flow/cadence/rhythm
- "key_bar": a defining bar of the song, quotable or thematic
- Most bars will have empty annotations - only annotate when genuinely applicable
- Be selective with annotations, not everything is a punchline
- Bars with no annotations should still be included with an empty annotations list"""


class BarAnnotator:
    def __init__(self):
        self.client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

    def annotate_bars(self, title: str, bars: list[str]) -> list[dict]:
        # Batch into chunks of 50 bars to avoid response truncation
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
        """Annotate a batch of bars via Claude API."""
        numbered = "\n".join(f"{i + offset}: {bar}" for i, bar in enumerate(bars))
        prompt = BAR_ANNOTATION_PROMPT.format(title=title, numbered_bars=numbered)

        try:
            response = self.client.messages.create(
                model=settings.claude_model,
                max_tokens=8192,
                messages=[{"role": "user", "content": prompt}],
            )

            # Get text from first text content block
            raw = ""
            for block in response.content:
                if hasattr(block, "text"):
                    raw = block.text
                    break

            if not raw.strip():
                logger.error(
                    "Empty response from Claude for '%s' (bars %d-%d). "
                    "Content blocks: %s",
                    title, offset, offset + len(bars) - 1,
                    [type(b).__name__ for b in response.content],
                )
                return self._empty_annotations(bars, offset)

            result = self._extract_json(raw)
            if result is None:
                logger.error(
                    "Failed to extract JSON for '%s' (bars %d-%d). "
                    "Raw response (first 500 chars): %s",
                    title, offset, offset + len(bars) - 1, raw[:500],
                )
                return self._empty_annotations(bars, offset)

            return result.get("bars", [])

        except anthropic.APIError as e:
            logger.error("Anthropic API error during bar annotation: %s", e)
            return self._empty_annotations(bars, offset)

    def _extract_json(self, raw: str) -> dict | None:
        """Try multiple strategies to extract JSON from Claude's response."""
        text = raw.strip()

        # Strategy 1: Direct parse (response is pure JSON)
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            pass

        # Strategy 2: Extract from markdown code block
        code_match = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
        if code_match:
            try:
                return json.loads(code_match.group(1).strip())
            except json.JSONDecodeError:
                pass

        # Strategy 3: Find the outermost JSON object { ... }
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
        """Return empty annotations as a fallback."""
        return [
            {
                "bar_index": i + offset,
                "annotations": [],
                "punchline_explanation": None,
                "reference_target": None,
                "rhyme_group": None,
            }
            for i in range(len(bars))
        ]
