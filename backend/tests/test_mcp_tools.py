"""Tests for MCP tools and chat endpoint."""

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.mark.asyncio
async def test_health(client):
    response = await client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


@pytest.mark.asyncio
async def test_chat_endpoint_exists(client):
    response = await client.post(
        "/api/chat/",
        json={"messages": [{"role": "user", "content": "hello"}]},
    )
    # May fail without API key, but endpoint should exist (not 404)
    assert response.status_code != 404


@pytest.mark.asyncio
async def test_ingest_endpoint_exists(client):
    response = await client.post(
        "/api/ingest/album",
        json={
            "artist_name": "Test",
            "artist_slug": "test",
            "album_name": "Test Album",
            "album_slug": "test-album",
        },
    )
    # May fail without Genius token, but endpoint should exist
    assert response.status_code != 404
