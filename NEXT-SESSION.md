# Raag — Next Session Briefing

Use this file to start a new Claude Code session. Copy the starter prompt at the bottom, or just say "read NEXT-SESSION.md and start /plan".

---

## Current Project State (as of March 6, 2026)

### What's Built & Working

**Backend (FastAPI) — 6 API modules, all production-ready:**
- `backend/app/api/chat.py` — POST `/api/chat/` (sync) + POST `/api/chat/stream` (SSE streaming with agentic tool loop, rate limit retry)
- `backend/app/api/songs.py` — GET `/api/songs/{id}` (full detail) + POST `/api/songs/bars/{id}/describe` (Claude-powered bar analysis with caching)
- `backend/app/api/graph.py` — GET `/api/graph/data` (knowledge graph with 5-min cache, 6 node types) + POST `/api/graph/refresh`
- `backend/app/api/ingestion.py` — POST `/api/ingest/album`, `/download-audio`, `/download-and-ingest` (full pipeline: Genius lyrics + yt-dlp audio + CLAP/MiniLM embeddings + Claude NLP)
- `backend/app/api/spotify.py` — OAuth flow (auth-url, token, refresh) + track search + match-all + per-song lookup
- `backend/app/api/lyrics_sync.py` — GET `/api/songs/{id}/timing` (LRCLIB synced or duration-estimated) + POST compute-timing

**Database — 8 tables, all fully modeled:**
artists, albums, songs, lyrics, bars, entity_mentions, feature_artists, human_corrections
- Models: `backend/app/db/postgres.py` (SQLAlchemy 2.0 async, UUID PKs, JSONB for annotations/rhymes)
- Vectors: `backend/app/db/qdrant.py` (raag_audio_embeddings 512-dim, raag_lyric_embeddings 384-dim)

**ML Pipeline — all implemented:**
- Audio: CLAP encoder (512-dim, 30s chunks) + librosa features (tempo, key, energy, spectral, mood)
- Lyrics: MiniLM-L12-v2 (384-dim) + Genius section parser + MC name normalization
- NLP: BART-MNLI topics (10 primary + 11 secondary) + Claude entity extraction + Claude bar annotation + Claude rhyme annotation
- Timing: LRCLIB synced lyrics + duration-based estimation fallback

**Frontend (Next.js 16 + Tailwind + Zustand) — 3 routes:**
- `/` — Chat interface with streaming SSE, song/lyric/bar cards, album carousel, suggestion chips
- `/universe` — 3D force-directed graph (react-force-graph-3d), 6 node types, stance-colored edges, 4 view modes, side panel
- `/song/[id]` — Deep dive with annotated lyrics, MC color borders, rhyme highlighting, synced/static toggle, bar-click AI analysis

**Spotify Integration — fully wired:**
- OAuth + Web Playback SDK + draggable mini player bubble + auto-sync to lyrics

**Design System:**
- Glass morphism (backdrop blur, frosted cards, subtle borders)
- Custom fonts: KinetikaMaut (display), TTCommonsPro (body), Inter (sans), Noto Sans Devanagari
- Colors: #050505 bg, #d91d1c brand red, emerald (Encore), amber (Calm)
- 10+ CSS animations (cascade-in, fade-in-up, float, heartbeat, carousel, ripple)
- Responsive with prefers-reduced-motion support

### What's NOT Built

**Backend gaps:**
- No user/auth system (completely open API, no users table)
- No chat history storage (stateless — messages only live in frontend Zustand)
- No conversation memory (Claude has no context of past chats)
- No playlist builder endpoint
- Celery configured but unused (ingestion runs synchronously)
- Segment detector placeholder (`backend/app/ml/audio/segment_detector.py` — TODO)
- Single artist only (Seedhe Maut ingested, multi-artist untested)

**Frontend gaps:**
- No auth UI (no login/signup/profile)
- No chat history sidebar (can't revisit old conversations)
- No playlist builder UI
- No MC comparison view
- No analytics dashboard / album evolution charts
- Timeline view mode exists but implementation unclear
- Deep dive ~80% (some synced mode edge cases)
- No ingestion management UI (admin panel for triggering ingests)

### ECC Tools Installed (globally at ~/.claude/)
- 16 agents, 40 commands, 65 skills, rules for python/typescript/common
- Plugin: `~/.claude/plugins/everything-claude-code` (symlinked to submodule)
- Hook profile: `ECC_HOOK_PROFILE=minimal` (session tracking + cost tracking)
- MCP servers: figma, vercel, context7, sequential-thinking, memory

---

## Workstream 1: Major Backend Upgrade

### 1A. User Auth System
**Goal:** JWT-based auth with session management

New files needed:
- `backend/app/db/postgres.py` — Add User model (id, email, password_hash, display_name, created_at, preferences JSONB)
- `backend/app/api/auth.py` — POST `/api/auth/register`, `/api/auth/login`, `/api/auth/me`, `/api/auth/refresh`
- `backend/app/api/middleware.py` — JWT middleware, get_current_user dependency
- Frontend: `frontend/src/lib/auth-store.ts`, `frontend/src/components/auth/` (LoginModal, UserMenu)

Touches:
- `backend/app/main.py` — add auth router + middleware
- `frontend/src/lib/api.ts` — add Authorization header to all requests
- `frontend/src/app/layout.tsx` — wrap with auth provider

### 1B. Chat History & Conversation Memory
**Goal:** Persist conversations, let users revisit them, give Claude conversation context

New DB tables:
- `conversations` (id, user_id, title, created_at, updated_at, metadata_)
- `messages` (id, conversation_id, role, content, tool_calls JSONB, tool_results JSONB, created_at)

Backend changes:
- `backend/app/api/chat.py` — accept conversation_id, store messages, load history for Claude context
- New: `backend/app/api/conversations.py` — GET list, GET by id, DELETE, PATCH (rename)

Frontend changes:
- `frontend/src/lib/store.ts` — add conversation management (list, select, create, delete)
- `frontend/src/components/chat/ChatSidebar.tsx` — conversation history sidebar (like ChatGPT)
- `frontend/src/components/chat/ChatContainer.tsx` — load conversation on select

### 1C. Playlist Builder
**Goal:** Users create playlists via chat or manual curation, export to Spotify

New DB: `playlists` (id, user_id, name, description, song_ids[], spotify_playlist_id, created_at)

Backend:
- `backend/app/api/playlists.py` — CRUD + export-to-spotify + AI-generate
- MCP tool: `tool_create_playlist` — let Claude build playlists from chat

Frontend:
- `frontend/src/components/playlist/PlaylistBuilder.tsx` — drag-reorder, add/remove songs
- `frontend/src/components/playlist/PlaylistCard.tsx` — display in chat results

### 1D. Multi-Artist Expansion
**Goal:** Validate that a second artist can be ingested without breaking anything

Test with a second artist. Ensure:
- Graph data separates by artist
- Chat search includes artist context
- Album art mapping handles new entries
- Spotify matching works cross-artist

---

## Workstream 2: Maximum Visual UI Overhaul

### 2A. Chat Page (`/`) — `frontend/src/app/page.tsx`
Current: Functional but basic layout. Empty state has carousel + suggestions.

Improvements:
- **Chat sidebar** — left panel with conversation history, search, new chat button (like ChatGPT/Claude.ai)
- **Richer empty state** — animated hero with Seedhe Maut branding, stats counters (songs ingested, bars annotated, etc.)
- **Message polish** — avatar animations on receive, typing indicator with SM logo pulse, smoother streaming text appearance
- **Tool result cards** — larger album art in song cards, hover previews, mini waveforms for audio results
- **Input area** — model selector dropdown (future), attachment button placeholder, voice input button placeholder
- **Mobile** — bottom sheet for sidebar, full-width cards, swipe gestures

Files: `ChatContainer.tsx`, `ChatMessage.tsx`, `ChatInput.tsx`, `page.tsx`

### 2B. Universe Page (`/universe`) — `frontend/src/app/universe/page.tsx`
Current: 3D force graph with side panel. Functional but can be more immersive.

Improvements:
- **Ambient background** — subtle particle field or gradient mesh behind graph
- **Node interactions** — hover tooltip preview (mini card), double-click to expand neighborhood, right-click context menu
- **Edge labels** — show relationship type on hover
- **Graph legend** — floating color legend for node/edge types
- **Minimap** — corner overview of full graph with viewport indicator
- **Search overlay** — Cmd+K to search nodes, fly camera to result
- **Panel polish** — slide-in panel with tabs (Info, Connections, Bars), smoother transitions
- **Loading** — skeleton with fake graph wireframe animation

Files: `ForceGraph.tsx`, `GraphSidePanel.tsx`, `UniverseControls.tsx`, `UniverseHeader.tsx`

### 2C. Song Deep Dive (`/song/[id]`) — `frontend/src/app/song/[id]/page.tsx`
Current: 2-column layout with lyrics + sidebar. ~80% complete.

Improvements:
- **Hero header** — full-width album art blur background, large title, play button, stats row
- **Lyrics panel** — section headers as sticky dividers, smoother active bar scrolling, bar hover → quick preview tooltip
- **Annotation drawer** — bottom sheet (mobile) or inline expand (desktop) for bar analysis, with animated reveal
- **Rhyme visualization** — arc diagram connecting rhyming bars (SVG overlay), or color-coded margin dots
- **Sidebar** — sticky scroll, collapsible sections, sparkline charts for energy/flow density
- **Entity links** — click entity → fly to universe graph centered on that node
- **Share** — generate shareable image of a bar with annotations (canvas export)

Files: `SongDeepDive.tsx`, `AnnotatedLyrics.tsx`, `DeepDiveBar.tsx`, `SongSidebar.tsx`, `SongDeepDiveHeader.tsx`

### 2D. Global UI Polish
- **Page transitions** — framer-motion page enter/exit animations
- **Loading states** — skeleton screens for every data-fetching component
- **Toast system** — styled sonner toasts matching glass theme
- **Scroll progress** — thin red progress bar at top of deep dive page
- **Keyboard shortcuts** — Cmd+K search, Space play/pause, arrow keys navigate bars
- **Favicon + meta** — proper OG tags, custom favicon, page titles

Files: `layout.tsx`, `globals.css`, `frontend/src/lib/constants.ts`

---

## Suggested ECC Workflow

```
# 1. Start with architecture planning
/plan

# 2. For each new backend module, use TDD
/tdd  (write tests first for auth, chat history, playlists)

# 3. After implementation batches, review
/code-review

# 4. For build issues
/build-fix

# 5. After major milestones, extract patterns
/learn
```

---

## Starter Prompt

Copy everything below this line and paste it into a fresh Claude Code session:

---

```
Read the file NEXT-SESSION.md at the project root for full context on where this project stands and what we're building next.

Then run /plan to create a detailed implementation plan for TWO parallel workstreams:

**Workstream 1 — Backend Upgrade (priority order):**
1. User auth system (JWT, User model, login/register endpoints, middleware)
2. Chat history persistence (conversations + messages tables, conversation_id in chat endpoint, history loading)
3. Conversation memory (inject last N messages as Claude context)
4. Playlist builder (CRUD API, MCP tool for Claude, Spotify export)

**Workstream 2 — Visual UI Overhaul (all pages):**
1. Chat page: conversation sidebar, richer empty state, polished message cards, better streaming UX
2. Universe page: ambient background, hover tooltips, graph legend, search overlay, minimap
3. Deep dive page: hero header with blur background, smoother synced scrolling, annotation drawer, rhyme arc visualization
4. Global: page transitions (framer-motion), skeleton loaders everywhere, keyboard shortcuts, scroll progress bar

For the plan:
- Break each workstream into phases that can be committed independently
- Identify shared dependencies (e.g., auth must come before chat history)
- List every file that needs to be created or modified
- Note which existing utilities/patterns to reuse (glass-card CSS, Zustand store pattern, api.ts fetch helpers)
- Estimate complexity per phase (S/M/L)

After planning, we'll execute with /tdd for backend modules and direct implementation for frontend.
```

---

## Key File Reference

| Area | Path |
|------|------|
| Backend entry | `backend/app/main.py` |
| API routes | `backend/app/api/chat.py`, `songs.py`, `graph.py`, `ingestion.py`, `spotify.py`, `lyrics_sync.py` |
| DB models | `backend/app/db/postgres.py` |
| Config | `backend/app/config.py` |
| MCP tools | `backend/app/mcp/server.py` |
| Frontend home | `frontend/src/app/page.tsx` |
| Chat UI | `frontend/src/components/chat/ChatContainer.tsx`, `ChatMessage.tsx`, `ChatInput.tsx` |
| Universe | `frontend/src/components/universe/ForceGraph.tsx`, `GraphSidePanel.tsx` |
| Deep dive | `frontend/src/components/song/deep-dive/SongDeepDive.tsx`, `AnnotatedLyrics.tsx`, `DeepDiveBar.tsx` |
| Spotify | `frontend/src/components/spotify/SpotifyMiniPlayer.tsx`, `SpotifySDK.tsx` |
| Stores | `frontend/src/lib/store.ts`, `universe-store.ts`, `spotify-store.ts` |
| API client | `frontend/src/lib/api.ts` |
| Types | `frontend/src/lib/types.ts` |
| Styles | `frontend/src/app/globals.css` |
| Constants | `frontend/src/lib/constants.ts`, `graph-constants.ts`, `rhyme-constants.ts`, `album-art.ts` |
| Project plan | `raag-project-plan.md` |
| Claude config | `CLAUDE.md` |
