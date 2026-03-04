from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.mcp.tools.context import describe_bar, get_song_context

router = APIRouter(prefix="/api/songs", tags=["songs"])


@router.get("/{song_id}")
async def get_song(song_id: str):
    result = await get_song_context(song_id)
    if not result:
        raise HTTPException(status_code=404, detail="Song not found")
    return result


@router.post("/bars/{bar_id}/describe")
async def describe_bar_endpoint(bar_id: str):
    result = await describe_bar(bar_id)
    if not result:
        raise HTTPException(status_code=404, detail="Bar not found")
    return result
