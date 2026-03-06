#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log()  { echo -e "${GREEN}[raag]${NC} $1"; }
warn() { echo -e "${YELLOW}[raag]${NC} $1"; }
err()  { echo -e "${RED}[raag]${NC} $1"; }

cleanup() {
    log "Shutting down..."
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    exit 0
}
trap cleanup SIGINT SIGTERM

# ── 1. Check prerequisites ──────────────────────────────────────────
log "Checking prerequisites..."

if ! command -v python3 &>/dev/null; then
    err "python3 not found"; exit 1
fi
if ! command -v bun &>/dev/null; then
    err "bun not found. Install: curl -fsSL https://bun.sh/install | bash"; exit 1
fi
if ! command -v ffmpeg &>/dev/null; then
    warn "ffmpeg not found — YouTube audio download won't work. Install: brew install ffmpeg"
fi

# ── 2. Python venv ──────────────────────────────────────────────────
if [ ! -d ".venv" ]; then
    log "Creating Python virtual environment..."
    python3 -m venv .venv
fi
source .venv/bin/activate

# Quick check: if fastapi isn't installed, run pip install
if ! python -c "import fastapi" 2>/dev/null; then
    log "Installing Python dependencies (first run, may take a few minutes)..."
    pip install -q -r backend/requirements.txt
fi

# ── 3. Environment file ─────────────────────────────────────────────
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        warn "Created .env from .env.example — edit it with your API keys"
    else
        err ".env file missing and no .env.example found"; exit 1
    fi
fi

# ── 4. PostgreSQL ────────────────────────────────────────────────────
log "Checking PostgreSQL..."
if ! pg_isready -q 2>/dev/null; then
    warn "PostgreSQL not running. Trying to start with brew..."
    brew services start postgresql@15 2>/dev/null || brew services start postgresql 2>/dev/null || {
        err "Could not start PostgreSQL. Start it manually and re-run."
        exit 1
    }
    sleep 2
fi

# Create database if needed
if ! psql -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw raag; then
    log "Creating 'raag' database..."
    psql postgres -c "CREATE DATABASE raag;" 2>/dev/null || true
fi

# Run migrations
log "Running database migrations..."
(cd backend && alembic upgrade head 2>&1 | tail -1)

# ── 5. Redis ─────────────────────────────────────────────────────────
log "Checking Redis..."
if ! redis-cli ping &>/dev/null; then
    warn "Redis not running. Trying to start with brew..."
    brew services start redis 2>/dev/null || {
        warn "Could not start Redis. Celery won't work, but the app will still run."
    }
    sleep 1
fi

# ── 6. Docker + Qdrant ──────────────────────────────────────────────
log "Checking Qdrant..."
if curl -sf http://localhost:6333/healthz &>/dev/null; then
    log "Qdrant already running"
else
    if ! docker info &>/dev/null 2>&1; then
        warn "Docker not running. Starting Docker Desktop..."
        open -a Docker 2>/dev/null || true
        # Wait up to 30s for Docker to start
        for i in $(seq 1 15); do
            if docker info &>/dev/null 2>&1; then break; fi
            sleep 2
        done
        if ! docker info &>/dev/null 2>&1; then
            warn "Docker didn't start in time. Qdrant won't be available."
            warn "Start Docker Desktop manually, then run: docker compose up -d qdrant"
        fi
    fi

    if docker info &>/dev/null 2>&1; then
        log "Starting Qdrant container..."
        docker compose up -d qdrant 2>&1 | tail -1
        # Wait for Qdrant to be healthy
        for i in $(seq 1 10); do
            if curl -sf http://localhost:6333/healthz &>/dev/null; then break; fi
            sleep 1
        done
    fi
fi

# Initialize Qdrant collections
python -c "
import sys; sys.path.insert(0, 'backend')
from app.db.qdrant import QdrantManager
try:
    QdrantManager().initialize_collections()
    print('  Qdrant collections initialized')
except Exception as e:
    print(f'  Qdrant init skipped: {e}')
" 2>/dev/null

# ── 7. Frontend deps ────────────────────────────────────────────────
if [ ! -d "frontend/node_modules" ]; then
    log "Installing frontend dependencies..."
    (cd frontend && bun install --silent)
fi

# ── 8. Start services ───────────────────────────────────────────────
echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}  Raag - Music Intelligence Platform${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  Backend:  ${GREEN}http://localhost:8000${NC}"
echo -e "  Frontend: ${GREEN}https://127.0.0.1:3000${NC}"
echo -e "  API docs: ${GREEN}http://localhost:8000/docs${NC}"
echo ""
echo -e "  Press ${YELLOW}Ctrl+C${NC} to stop all services"
echo ""

# Start backend
log "Starting backend..."
(cd backend && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 2>&1 | sed 's/^/  [backend] /') &
BACKEND_PID=$!

sleep 1

# Start frontend
log "Starting frontend..."
(cd frontend && bun dev --experimental-https 2>&1 | sed 's/^/  [frontend] /') &
FRONTEND_PID=$!

# Wait for either to exit
wait $BACKEND_PID $FRONTEND_PID
