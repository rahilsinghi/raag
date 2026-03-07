from __future__ import annotations

import asyncio
import json
import logging
import time
import uuid
from collections.abc import AsyncGenerator

import anthropic
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_optional_user
from app.config import settings
from app.db.postgres import Conversation, Message, User, async_session
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

# Max messages to load from DB for Claude context
MAX_HISTORY_MESSAGES = 50


class ChatRequest(BaseModel):
    messages: list[dict]
    conversation_id: str | None = None


class ChatResponse(BaseModel):
    role: str = "assistant"
    content: str
    toolResults: list[dict] | None = None


# ---------- history helpers ----------

async def _load_history(conversation_id: uuid.UUID) -> list[dict]:
    """Load recent messages from DB to provide conversation context to Claude."""
    async with async_session() as session:
        result = await session.execute(
            select(Message)
            .where(Message.conversation_id == conversation_id)
            .order_by(Message.created_at.desc())
            .limit(MAX_HISTORY_MESSAGES)
        )
        db_messages = list(reversed(result.scalars().all()))

    history: list[dict] = []
    for msg in db_messages:
        entry = {"role": msg.role, "content": msg.content}
        history.append(entry)
    return history


async def _save_message(
    conversation_id: uuid.UUID,
    role: str,
    content: str,
    tool_calls: list[dict] | None = None,
    tool_results: list[dict] | None = None,
) -> None:
    """Persist a single message to the DB."""
    async with async_session() as session:
        session.add(Message(
            conversation_id=conversation_id,
            role=role,
            content=content,
            tool_calls=tool_calls,
            tool_results=tool_results,
        ))
        # Touch conversation updated_at
        await session.execute(
            update(Conversation)
            .where(Conversation.id == conversation_id)
            .values()
        )
        await session.commit()


async def _ensure_conversation(
    conversation_id: str | None,
    user: User | None,
) -> uuid.UUID | None:
    """Get or create a conversation. Returns conversation UUID or None if no persistence."""
    if conversation_id:
        return uuid.UUID(conversation_id)

    # Only auto-create for authenticated users
    if user is None:
        return None

    async with async_session() as session:
        conv = Conversation(user_id=user.id)
        session.add(conv)
        await session.commit()
        await session.refresh(conv)
        return conv.id


async def _generate_title(first_message: str) -> str:
    """Generate a short conversation title from the first user message."""
    client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
    resp = await client.messages.create(
        model=settings.claude_model,
        max_tokens=30,
        messages=[{
            "role": "user",
            "content": f"Generate a 3-5 word title for a conversation that starts with this message. Return ONLY the title, no quotes or punctuation:\n\n{first_message[:200]}",
        }],
    )
    return resp.content[0].text.strip()[:255]


async def _set_title_if_needed(conversation_id: uuid.UUID, first_message: str) -> str | None:
    """If conversation has no title, generate one in the background."""
    async with async_session() as session:
        result = await session.execute(
            select(Conversation.title).where(Conversation.id == conversation_id)
        )
        title = result.scalar_one_or_none()
        if title is not None:
            return title

    try:
        title = await _generate_title(first_message)
        async with async_session() as session:
            await session.execute(
                update(Conversation)
                .where(Conversation.id == conversation_id)
                .values(title=title)
            )
            await session.commit()
        return title
    except Exception:
        logger.exception("Failed to generate title")
        return None


# ---------- sync endpoint ----------

@router.post("/")
async def chat(
    request: ChatRequest,
    user: User | None = Depends(get_optional_user),
) -> ChatResponse:
    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    conv_id = await _ensure_conversation(request.conversation_id, user)

    # Build message list: history from DB + current request messages
    messages: list[dict] = []
    if conv_id:
        messages = await _load_history(conv_id)

    # Append new messages from the request (only user messages not already in DB)
    for msg in request.messages:
        messages.append({"role": msg["role"], "content": msg["content"]})

    # Save user message
    user_content = request.messages[-1]["content"] if request.messages else ""
    if conv_id:
        await _save_message(conv_id, "user", user_content)

    all_tool_results = []

    while True:
        for attempt in range(3):
            try:
                response = client.messages.create(
                    model=settings.claude_model,
                    max_tokens=4096,
                    system=SYSTEM_PROMPT,
                    tools=TOOL_DEFINITIONS,
                    messages=messages,
                )
                break
            except anthropic.RateLimitError:
                if attempt < 2:
                    wait = 2 ** attempt * 5
                    logger.warning("Rate limited, retrying in %ds...", wait)
                    time.sleep(wait)
                else:
                    raise

        tool_use_blocks = [b for b in response.content if b.type == "tool_use"]

        if not tool_use_blocks:
            text_content = ""
            for block in response.content:
                if block.type == "text":
                    text_content += block.text

            # Save assistant response
            if conv_id:
                await _save_message(
                    conv_id, "assistant", text_content,
                    tool_results=all_tool_results if all_tool_results else None,
                )
                # Generate title from first user message
                asyncio.ensure_future(_set_title_if_needed(conv_id, user_content))

            return ChatResponse(
                content=text_content,
                toolResults=all_tool_results if all_tool_results else None,
            )

        messages.append({"role": "assistant", "content": response.content})
        tool_results_for_claude = []

        for tool_block in tool_use_blocks:
            tool_name = tool_block.name
            tool_input = tool_block.input
            handler = TOOL_HANDLERS.get(tool_name)
            if handler:
                try:
                    result = await handler(**tool_input)
                    all_tool_results.append({"toolName": tool_name, "data": result})
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


# ---------- streaming endpoint ----------

def _sse(data: dict) -> str:
    return f"data: {json.dumps(data, default=str)}\n\n"


async def _stream_chat(
    messages: list[dict],
    conv_id: uuid.UUID | None,
    user_content: str,
) -> AsyncGenerator[str, None]:
    client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

    # Load conversation history from DB
    conv: list[dict] = []
    if conv_id:
        conv = await _load_history(conv_id)

    # Append current request messages
    for msg in messages:
        conv.append({"role": msg["role"], "content": msg["content"]})

    # Save user message to DB
    if conv_id:
        await _save_message(conv_id, "user", user_content)

    # Emit conversation_id so frontend can track it
    if conv_id:
        yield _sse({"type": "conversation_id", "id": str(conv_id)})

    all_tool_results: list[dict] = []
    full_text = ""

    while True:
        stream = None
        for attempt in range(3):
            try:
                stream = client.messages.stream(
                    model=settings.claude_model,
                    max_tokens=4096,
                    system=SYSTEM_PROMPT,
                    tools=TOOL_DEFINITIONS,
                    messages=conv,
                )
                break
            except anthropic.RateLimitError:
                if attempt < 2:
                    wait = 2**attempt * 5
                    logger.warning("Rate limited, retrying in %ds...", wait)
                    await asyncio.sleep(wait)
                else:
                    yield _sse({"type": "error", "message": "Rate limited"})
                    return

        if stream is None:
            yield _sse({"type": "error", "message": "Failed to connect to Claude"})
            return

        async with stream as s:
            async for event in s:
                if event.type == "content_block_delta":
                    if event.delta.type == "text_delta":
                        full_text += event.delta.text
                        yield _sse({"type": "text_delta", "content": event.delta.text})

            response = await s.get_final_message()

        tool_use_blocks = [b for b in response.content if b.type == "tool_use"]

        if not tool_use_blocks:
            # Save assistant response to DB
            if conv_id:
                await _save_message(
                    conv_id, "assistant", full_text,
                    tool_results=all_tool_results if all_tool_results else None,
                )
                # Generate title (fire and forget)
                asyncio.ensure_future(_set_title_if_needed(conv_id, user_content))

            yield _sse({"type": "done"})
            return

        conv.append({"role": "assistant", "content": response.content})
        tool_results_for_claude: list[dict] = []

        for tool_block in tool_use_blocks:
            tool_name = tool_block.name
            yield _sse({"type": "tool_start", "toolName": tool_name})

            handler = TOOL_HANDLERS.get(tool_name)
            if handler:
                try:
                    result = await handler(**tool_block.input)
                    all_tool_results.append({"toolName": tool_name, "data": result})
                    yield _sse({"type": "tool_result", "toolName": tool_name, "data": result})
                    tool_results_for_claude.append({
                        "type": "tool_result",
                        "tool_use_id": tool_block.id,
                        "content": json.dumps(result, default=str),
                    })
                except Exception as e:
                    logger.error("Tool %s failed: %s", tool_name, e)
                    yield _sse({"type": "tool_result", "toolName": tool_name, "data": {"error": str(e)}})
                    tool_results_for_claude.append({
                        "type": "tool_result",
                        "tool_use_id": tool_block.id,
                        "content": json.dumps({"error": str(e)}),
                        "is_error": True,
                    })
            else:
                yield _sse({"type": "tool_result", "toolName": tool_name, "data": {"error": f"Unknown tool: {tool_name}"}})
                tool_results_for_claude.append({
                    "type": "tool_result",
                    "tool_use_id": tool_block.id,
                    "content": json.dumps({"error": f"Unknown tool: {tool_name}"}),
                    "is_error": True,
                })

        conv.append({"role": "user", "content": tool_results_for_claude})


@router.post("/stream")
async def chat_stream(
    request: ChatRequest,
    user: User | None = Depends(get_optional_user),
):
    conv_id = await _ensure_conversation(request.conversation_id, user)
    user_content = request.messages[-1]["content"] if request.messages else ""

    return StreamingResponse(
        _stream_chat(request.messages, conv_id, user_content),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
