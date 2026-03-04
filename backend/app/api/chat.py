from __future__ import annotations

import json
import logging

import anthropic
from fastapi import APIRouter
from pydantic import BaseModel

from app.config import settings
from app.ingestion.youtube_downloader import download_album_audio
from app.mcp.tools.context import describe_bar, get_song_context
from app.mcp.tools.search import search_bars, search_by_lyrics, search_by_mood

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/chat", tags=["chat"])

SYSTEM_PROMPT = """You are Raag, an AI-powered Indian hip-hop intelligence engine specializing in Seedhe Maut (Encore ABJ & Calm).

You have tools to search their music by mood/sound, lyrical themes, individual bars, and get full song context. Use them to give data-backed answers.

IMPORTANT — Output style:
- Keep text responses SHORT (2-4 sentences max). The tool result cards display song data, lyrics, and bars visually — do NOT repeat what's already shown in the cards.
- Focus your text on insight, interpretation, and connecting the dots — not listing raw data.
- Always use the search tools for any question about moods, themes, lyrics, or comparisons.
- Reference the MC (Encore vs Calm) when relevant.
- If you find punchlines or wordplay, briefly explain the cleverness."""

TOOL_DEFINITIONS = [
    {
        "name": "search_by_mood",
        "description": "Search songs by mood/sound description using audio embeddings. Use for queries about vibes, energy, sound.",
        "input_schema": {
            "type": "object",
            "properties": {
                "description": {"type": "string", "description": "Mood/sound description"},
                "limit": {"type": "integer", "description": "Number of results", "default": 5},
            },
            "required": ["description"],
        },
    },
    {
        "name": "search_by_lyrics",
        "description": "Search lyrics by semantic similarity. Use for thematic queries about lyrical content.",
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Thematic search query"},
                "search_level": {
                    "type": "string",
                    "enum": ["full_song", "section", "bar"],
                    "default": "section",
                },
                "limit": {"type": "integer", "default": 5},
            },
            "required": ["query"],
        },
    },
    {
        "name": "search_bars",
        "description": "Search individual bars (lines) with optional annotation and MC filters.",
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {"type": "string"},
                "annotation_type": {
                    "type": "string",
                    "enum": ["punchline", "callback", "cultural_reference", "wordplay", "flow_switch", "key_bar"],
                },
                "mc": {"type": "string", "enum": ["Encore", "Calm"]},
                "limit": {"type": "integer", "default": 10},
            },
            "required": ["query"],
        },
    },
    {
        "name": "get_song_context",
        "description": "Get full song details including lyrics, bars, entities, and features.",
        "input_schema": {
            "type": "object",
            "properties": {
                "song_id": {"type": "string"},
            },
            "required": ["song_id"],
        },
    },
    {
        "name": "describe_bar",
        "description": "Get a detailed analysis of a specific bar/line — translation, meaning, wordplay, cultural references.",
        "input_schema": {
            "type": "object",
            "properties": {
                "bar_id": {"type": "string", "description": "UUID of the bar to describe"},
            },
            "required": ["bar_id"],
        },
    },
    {
        "name": "download_album_audio",
        "description": "Download audio from a YouTube URL (video or playlist) and save as MP3s. Use when audio files are needed before analysis.",
        "input_schema": {
            "type": "object",
            "properties": {
                "url": {"type": "string", "description": "YouTube video or playlist URL"},
                "artist_slug": {"type": "string", "description": "Artist slug for file path"},
                "album_slug": {"type": "string", "description": "Album slug for file path"},
            },
            "required": ["url", "artist_slug", "album_slug"],
        },
    },
]


async def _download_audio_handler(url: str, artist_slug: str, album_slug: str) -> dict:
    import asyncio
    return await asyncio.to_thread(download_album_audio, url, artist_slug, album_slug)


TOOL_HANDLERS = {
    "search_by_mood": search_by_mood,
    "search_by_lyrics": search_by_lyrics,
    "search_bars": search_bars,
    "get_song_context": get_song_context,
    "describe_bar": describe_bar,
    "download_album_audio": _download_audio_handler,
}


class ChatRequest(BaseModel):
    messages: list[dict]


class ChatResponse(BaseModel):
    role: str = "assistant"
    content: str
    toolResults: list[dict] | None = None


@router.post("/")
async def chat(request: ChatRequest) -> ChatResponse:
    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

    messages = []
    for msg in request.messages:
        messages.append({
            "role": msg["role"],
            "content": msg["content"],
        })

    all_tool_results = []

    # Agentic loop: keep calling Claude until we get a final text response
    while True:
        response = client.messages.create(
            model=settings.claude_model,
            max_tokens=4096,
            system=SYSTEM_PROMPT,
            tools=TOOL_DEFINITIONS,
            messages=messages,
        )

        # Check if Claude wants to use tools
        tool_use_blocks = [b for b in response.content if b.type == "tool_use"]

        if not tool_use_blocks:
            # Final text response
            text_content = ""
            for block in response.content:
                if block.type == "text":
                    text_content += block.text
            return ChatResponse(
                content=text_content,
                toolResults=all_tool_results if all_tool_results else None,
            )

        # Process tool calls
        messages.append({"role": "assistant", "content": response.content})

        tool_results_for_claude = []
        for tool_block in tool_use_blocks:
            tool_name = tool_block.name
            tool_input = tool_block.input

            handler = TOOL_HANDLERS.get(tool_name)
            if handler:
                try:
                    result = await handler(**tool_input)
                    all_tool_results.append({
                        "toolName": tool_name,
                        "data": result,
                    })
                    tool_results_for_claude.append({
                        "type": "tool_result",
                        "tool_use_id": tool_block.id,
                        "content": json.dumps(result, default=str),
                    })
                except Exception as e:
                    logger.error("Tool %s failed: %s", tool_name, e)
                    tool_results_for_claude.append({
                        "type": "tool_result",
                        "tool_use_id": tool_block.id,
                        "content": json.dumps({"error": str(e)}),
                        "is_error": True,
                    })
            else:
                tool_results_for_claude.append({
                    "type": "tool_result",
                    "tool_use_id": tool_block.id,
                    "content": json.dumps({"error": f"Unknown tool: {tool_name}"}),
                    "is_error": True,
                })

        messages.append({"role": "user", "content": tool_results_for_claude})
