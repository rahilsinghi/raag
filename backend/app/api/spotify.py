from __future__ import annotations

import base64
from typing import Any
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Query, HTTPException
from pydantic import BaseModel
from sqlalchemy import select, update

from app.config import settings
from app.db.postgres import Album, Song, async_session

router = APIRouter(prefix="/api/spotify", tags=["spotify"])

SPOTIFY_AUTH_URL = "https://accounts.spotify.com/authorize"
SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token"
SPOTIFY_API = "https://api.spotify.com/v1"

SCOPES = "streaming user-read-email user-read-private user-read-playback-state user-modify-playback-state"

# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------


class AuthUrlResponse(BaseModel):
    url: str


class TokenRequest(BaseModel):
    code: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    expires_in: int


class RefreshRequest(BaseModel):
    refresh_token: str


class SpotifyTrack(BaseModel):
    spotify_id: str
    name: str
    artists: list[str]
    album_name: str
    album_art_url: str | None
    preview_url: str | None
    external_url: str
    duration_ms: int


class MatchResult(BaseModel):
    song_id: str
    song_title: str
    spotify_track: SpotifyTrack | None
    matched: bool


def _basic_auth_header() -> str:
    """Spotify requires Base64(client_id:client_secret) for token requests."""
    raw = f"{settings.spotify_client_id}:{settings.spotify_client_secret}"
    return base64.b64encode(raw.encode()).decode()


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.get("/auth-url", response_model=AuthUrlResponse)
async def get_auth_url():
    """Generate Spotify OAuth URL (Authorization Code flow, no PKCE)."""
    params = {
        "client_id": settings.spotify_client_id,
        "response_type": "code",
        "redirect_uri": settings.spotify_redirect_uri,
        "scope": SCOPES,
    }
    url = f"{SPOTIFY_AUTH_URL}?{urlencode(params)}"
    return AuthUrlResponse(url=url)


@router.post("/token", response_model=TokenResponse)
async def exchange_token(body: TokenRequest):
    """Exchange auth code for access/refresh tokens using client_secret."""
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            SPOTIFY_TOKEN_URL,
            data={
                "grant_type": "authorization_code",
                "code": body.code,
                "redirect_uri": settings.spotify_redirect_uri,
            },
            headers={
                "Content-Type": "application/x-www-form-urlencoded",
                "Authorization": f"Basic {_basic_auth_header()}",
            },
        )
    if resp.status_code != 200:
        raise HTTPException(status_code=resp.status_code, detail=resp.json())
    data = resp.json()
    return TokenResponse(
        access_token=data["access_token"],
        refresh_token=data["refresh_token"],
        expires_in=data["expires_in"],
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(body: RefreshRequest):
    """Refresh an expired access token."""
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            SPOTIFY_TOKEN_URL,
            data={
                "grant_type": "refresh_token",
                "refresh_token": body.refresh_token,
            },
            headers={
                "Content-Type": "application/x-www-form-urlencoded",
                "Authorization": f"Basic {_basic_auth_header()}",
            },
        )
    if resp.status_code != 200:
        raise HTTPException(status_code=resp.status_code, detail=resp.json())
    data = resp.json()
    return TokenResponse(
        access_token=data["access_token"],
        refresh_token=data.get("refresh_token", body.refresh_token),
        expires_in=data["expires_in"],
    )


@router.get("/search")
async def search_track(
    q: str = Query(..., description="Search query"),
    access_token: str = Query(..., description="Spotify access token"),
) -> list[SpotifyTrack]:
    """Search Spotify for tracks."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{SPOTIFY_API}/search",
            params={"q": q, "type": "track", "limit": 5},
            headers={"Authorization": f"Bearer {access_token}"},
        )
    if resp.status_code != 200:
        raise HTTPException(status_code=resp.status_code, detail=resp.json())
    tracks = resp.json().get("tracks", {}).get("items", [])
    return [_parse_track(t) for t in tracks]


@router.post("/match-all")
async def match_all_songs(
    access_token: str = Query(..., description="Spotify access token"),
) -> list[MatchResult]:
    """Match all songs in DB to Spotify tracks. Stores spotify_track_id and preview_url."""
    results: list[MatchResult] = []

    async with async_session() as session:
        songs = (
            await session.execute(
                select(Song, Album.title.label("album_title"))
                .join(Album, Song.album_id == Album.id)
            )
        ).all()

    async with httpx.AsyncClient() as client:
        for row in songs:
            song = row[0]
            album_title = row[1]
            sid = str(song.id)

            # Skip already matched
            if song.spotify_track_id:
                results.append(
                    MatchResult(
                        song_id=sid,
                        song_title=song.title,
                        spotify_track=None,
                        matched=True,
                    )
                )
                continue

            q = f'track:"{song.title}" artist:Seedhe Maut'
            resp = await client.get(
                f"{SPOTIFY_API}/search",
                params={"q": q, "type": "track", "limit": 3},
                headers={"Authorization": f"Bearer {access_token}"},
            )
            if resp.status_code != 200:
                results.append(
                    MatchResult(song_id=sid, song_title=song.title, spotify_track=None, matched=False)
                )
                continue

            items = resp.json().get("tracks", {}).get("items", [])
            matched_track = _find_best_match(song.title, album_title, items)

            if matched_track:
                parsed = _parse_track(matched_track)
                async with async_session() as session:
                    await session.execute(
                        update(Song)
                        .where(Song.id == song.id)
                        .values(
                            spotify_track_id=parsed.spotify_id,
                            spotify_preview_url=parsed.preview_url,
                        )
                    )
                    await session.commit()
                results.append(
                    MatchResult(song_id=sid, song_title=song.title, spotify_track=parsed, matched=True)
                )
            else:
                results.append(
                    MatchResult(song_id=sid, song_title=song.title, spotify_track=None, matched=False)
                )

    return results


@router.get("/track/{song_id}")
async def get_song_spotify(song_id: str) -> dict[str, Any]:
    """Get Spotify info for a song by its DB id."""
    async with async_session() as session:
        song = (await session.execute(select(Song).where(Song.id == song_id))).scalar_one_or_none()
    if not song:
        raise HTTPException(status_code=404, detail="Song not found")
    return {
        "song_id": str(song.id),
        "title": song.title,
        "spotify_track_id": song.spotify_track_id,
        "spotify_preview_url": song.spotify_preview_url,
        "spotify_url": f"https://open.spotify.com/track/{song.spotify_track_id}" if song.spotify_track_id else None,
    }


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _parse_track(t: dict) -> SpotifyTrack:
    images = t.get("album", {}).get("images", [])
    return SpotifyTrack(
        spotify_id=t["id"],
        name=t["name"],
        artists=[a["name"] for a in t.get("artists", [])],
        album_name=t.get("album", {}).get("name", ""),
        album_art_url=images[0]["url"] if images else None,
        preview_url=t.get("preview_url"),
        external_url=t.get("external_urls", {}).get("spotify", ""),
        duration_ms=t.get("duration_ms", 0),
    )


def _find_best_match(
    song_title: str, album_title: str, items: list[dict]
) -> dict | None:
    if not items:
        return None

    song_lower = song_title.lower().strip()
    album_lower = album_title.lower().strip()

    for t in items:
        if (
            t["name"].lower().strip() == song_lower
            and t.get("album", {}).get("name", "").lower().strip() == album_lower
        ):
            return t

    for t in items:
        if t["name"].lower().strip() == song_lower:
            return t

    for t in items:
        if song_lower in t["name"].lower():
            return t

    for t in items:
        artists = [a["name"].lower() for a in t.get("artists", [])]
        if any("seedhe maut" in a for a in artists):
            return t

    return None
