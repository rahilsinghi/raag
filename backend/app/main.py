from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.chat import router as chat_router
from app.api.graph import router as graph_router
from app.api.ingestion import router as ingestion_router
from app.api.songs import router as songs_router
from app.api.spotify import router as spotify_router
from app.api.lyrics_sync import router as lyrics_sync_router
from app.mcp.server import mcp

app = FastAPI(title="Raag", version="0.1.0", description="Music Intelligence Platform")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://127.0.0.1:3000", "https://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat_router)
app.include_router(graph_router)
app.include_router(ingestion_router)
app.include_router(songs_router)
app.include_router(spotify_router)
app.include_router(lyrics_sync_router)
app.mount("/mcp", mcp.http_app(json_response=True))


@app.get("/health")
async def health():
    return {"status": "ok"}
