from __future__ import annotations

import json
import logging
import re

import anthropic

from app.config import settings

logger = logging.getLogger(__name__)

ENTITY_PROMPT = """You are an expert analyst of Indian hip-hop, specifically Seedhe Maut (a duo of Encore ABJ and Calm).

Analyze the following song lyrics and extract structured entities. Return ONLY valid JSON with no markdown formatting.

Song: "{title}"
Lyrics:
{lyrics}

Return JSON with these fields:
{{
  "artist_mentions": [
    {{"name": "artist name", "stance": "diss|shoutout|neutral|ambiguous", "context": "brief context"}}
  ],
  "place_references": [
    {{"name": "place name", "context": "brief context"}}
  ],
  "cultural_references": [
    {{"name": "reference", "type": "movie|song|brand|mythology|slang|other", "context": "brief context"}}
  ],
  "self_references": [
    {{"text": "the callback or self-reference", "target": "what it references"}}
  ],
  "featured_artists": [
    {{"name": "artist name", "role": "verse|hook|production|ad-libs"}}
  ]
}}

If a category has no entries, use an empty list. Be thorough but precise."""


class EntityExtractor:
    def __init__(self):
        self.client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

    def extract_entities(self, title: str, lyrics: str) -> dict:
        prompt = ENTITY_PROMPT.format(title=title, lyrics=lyrics[:4000])

        try:
            response = self.client.messages.create(
                model=settings.claude_model,
                max_tokens=2000,
                messages=[{"role": "user", "content": prompt}],
            )
            raw = response.content[0].text

            # Handle markdown code blocks
            code_match = re.search(r"```(?:json)?\s*([\s\S]*?)```", raw)
            if code_match:
                raw = code_match.group(1)

            return json.loads(raw.strip())
        except (json.JSONDecodeError, IndexError) as e:
            logger.error("Failed to parse entity extraction response: %s", e)
            return {
                "artist_mentions": [],
                "place_references": [],
                "cultural_references": [],
                "self_references": [],
                "featured_artists": [],
                "_raw_response": raw if "raw" in dir() else str(e),
            }
        except anthropic.APIError as e:
            logger.error("Anthropic API error during entity extraction: %s", e)
            return {
                "artist_mentions": [],
                "place_references": [],
                "cultural_references": [],
                "self_references": [],
                "featured_artists": [],
                "_error": str(e),
            }
