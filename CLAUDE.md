# CLAUDE.md — Raag

## Project Overview
Self-hosted music intelligence platform. Ingests artist discography (audio + lyrics + metadata), builds multimodal embeddings, exposes via conversational AI with MCP tools. Starting artist: Seedhe Maut (duo: Encore ABJ + Calm).

## Architecture

### Backend (FastAPI + Python)
- **Path**: `backend/app/`
- **Framework**: FastAPI + SQLAlchemy async + Celery + FastMCP
- **API routes**: `backend/app/api/` — chat.py, songs.py, graph.py, ingestion.py, lyrics_sync.py, spotify.py
- **DB models**: `backend/app/db/models.py` — 8 tables: artists, albums, songs, lyrics, bars, entity_mentions, feature_artists, human_corrections
- **ML pipeline**: `backend/app/ml/` — CLAP (audio 512-dim), MiniLM (lyrics 384-dim), BART-MNLI (topics), Claude Sonnet (entities/bars)
- **MCP server**: `backend/app/mcp/` — FastMCP tools for search, similarity, entity lookup
- **Config**: `backend/app/config.py` — reads `.env` from project root (2 parents up)

### Frontend (Next.js 16 + Tailwind)
- **Path**: `frontend/src/`
- **Package manager**: bun
- **Routes**: `/` (chat), `/universe` (force graph), `/song/[id]` (deep dive)
- **State**: Zustand stores in `frontend/src/lib/` — store.ts (chat), universe-store.ts, spotify-store.ts
- **Key components**: `components/chat/`, `components/universe/`, `components/song/`, `components/spotify/`
- **UI**: shadcn/ui components in `components/ui/`

### Infrastructure
- **DB**: PostgreSQL (local, user: rahilsinghi, no password)
- **Vector DB**: Qdrant (Docker, port 6333)
- **Queue**: Redis (local, port 6379) + Celery workers
- **Audio**: `data/audio/` organized by `artist-slug/album-slug/`

## Running

```bash
# Everything at once
./start.sh

# Download audio
./scripts/download-album.sh <youtube-url> <artist-slug> <album-slug>

# Ingest
python ml/scripts/batch_ingest.py
# or POST /api/ingest/download-and-ingest
```

## Conventions

### Code Style
- Python: snake_case, type hints, async/await for all DB and API calls
- TypeScript: camelCase, functional components, Zustand for state
- CSS: Tailwind utility classes, dark theme with `bg-[#050505]` base
- Colors: `#d91d1c` (brand red), emerald for Encore ABJ, amber for Calm, violet accents

### API Patterns
- All API routes prefixed with `/api/`
- Chat endpoint: POST `/api/chat/stream` (SSE streaming)
- FastMCP at `/mcp` (SSE transport)
- Swagger UI at `/docs`

### Frontend Patterns
- Dynamic imports for heavy components (ForceGraph)
- `glass-card` CSS class for card styling
- Album art via `getAlbumArt()` helper (static mapping)
- Spotify playback via Web Playback SDK + Zustand store

### Database
- Alembic migrations in `backend/alembic/`
- All models use UUID primary keys
- Bar annotations stored as JSONB arrays

## Environment
- `.env` at project root (not in backend/)
- Required vars: ANTHROPIC_API_KEY, SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, AUDIO_BASE_PATH (absolute path)
- Python venv (no poetry/uv)

## Important Notes
- FastMCP v3.1.0: no `json_response` in constructor, pass to `http_app()` instead
- yt-dlp requires ffmpeg (homebrew)
- next.config.ts has turbopack config with root set to ".."
- Everything Claude Code plugin installed globally at `~/.claude/plugins/everything-claude-code`
