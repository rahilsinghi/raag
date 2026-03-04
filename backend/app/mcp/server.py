import asyncio

from fastmcp import FastMCP

from app.ingestion.youtube_downloader import (
    download_album_audio,
    search_and_download_album,
    search_youtube,
)
from app.mcp.tools.context import get_song_context
from app.mcp.tools.search import search_bars, search_by_lyrics, search_by_mood

mcp = FastMCP("Raag - Artist Intelligence Engine")


@mcp.tool()
async def tool_search_by_mood(
    description: str,
    artist_id: str | None = None,
    album_id: str | None = None,
    limit: int = 5,
) -> list[dict]:
    """Search songs by mood or sound description. Uses CLAP audio embeddings to find
    songs matching a textual description like 'aggressive hard-hitting beat' or
    'chill melodic vibe'. Returns ranked song results with metadata."""
    return await search_by_mood(description, artist_id, album_id, limit)


@mcp.tool()
async def tool_search_by_lyrics(
    query: str,
    search_level: str = "section",
    artist_id: str | None = None,
    album_id: str | None = None,
    limit: int = 5,
) -> list[dict]:
    """Search lyrics by semantic similarity. search_level can be 'full_song', 'section',
    or 'bar'. Finds lyrics matching a thematic query like 'struggle and hustle' or
    'dissing other rappers'."""
    return await search_by_lyrics(query, search_level, artist_id, album_id, limit)


@mcp.tool()
async def tool_search_bars(
    query: str,
    annotation_type: str | None = None,
    mc: str | None = None,
    limit: int = 10,
) -> list[dict]:
    """Search individual bars (lines) with optional filters.
    annotation_type can be: punchline, callback, cultural_reference, wordplay, flow_switch, key_bar.
    mc can be: Encore, Calm."""
    return await search_bars(query, annotation_type, mc, limit)


@mcp.tool()
async def tool_get_song_context(song_id: str) -> dict | None:
    """Get complete context for a specific song including lyrics, all annotated bars,
    entity mentions, and featured artists."""
    return await get_song_context(song_id)


@mcp.tool()
async def tool_download_album_audio(
    url: str,
    artist_slug: str,
    album_slug: str,
) -> dict:
    """Download audio from a YouTube URL (video or playlist) and save to the audio
    directory. Files are saved as numbered MP3s ready for ingestion. Use this when
    audio files are not yet available locally."""
    return await asyncio.to_thread(download_album_audio, url, artist_slug, album_slug)


@mcp.tool()
async def tool_search_youtube(query: str, max_results: int = 5) -> list[dict]:
    """Search YouTube for videos matching a query. Returns titles, URLs, durations,
    and channels. Use this to find the right video/playlist before downloading."""
    return await asyncio.to_thread(search_youtube, query, max_results)


@mcp.tool()
async def tool_search_and_download_album(
    artist_name: str,
    album_name: str,
    artist_slug: str,
    album_slug: str,
) -> dict:
    """Search YouTube for an album by artist+album name, automatically pick the best
    result, and download all audio. Fully automated — no URL needed."""
    return await asyncio.to_thread(
        search_and_download_album, artist_name, album_name, artist_slug, album_slug
    )
