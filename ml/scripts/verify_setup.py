"""Diagnostic script: checks all service connections and model availability."""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "backend"))

from app.config import settings


async def check_postgres():
    from sqlalchemy import text
    from app.db.postgres import engine

    try:
        async with engine.connect() as conn:
            result = await conn.execute(text("SELECT count(*) FROM songs"))
            count = result.scalar()
        print(f"  Postgres: OK ({count} songs)")
        return True
    except Exception as e:
        print(f"  Postgres: FAILED - {e}")
        return False


def check_qdrant():
    try:
        from app.db.qdrant import QdrantManager

        qm = QdrantManager()
        collections = qm.client.get_collections().collections
        names = [c.name for c in collections]
        print(f"  Qdrant: OK (collections: {names})")
        return True
    except Exception as e:
        print(f"  Qdrant: FAILED - {e}")
        return False


def check_redis():
    import redis

    try:
        r = redis.from_url(settings.redis_url)
        r.ping()
        print("  Redis: OK")
        return True
    except Exception as e:
        print(f"  Redis: FAILED - {e}")
        return False


def check_audio_files():
    audio_dir = Path(settings.audio_base_path) / "seedhe-maut" / "nayaab"
    if not audio_dir.exists():
        print(f"  Audio files: MISSING ({audio_dir})")
        return False
    files = list(audio_dir.glob("*.*"))
    audio_files = [f for f in files if f.suffix.lower() in {".mp3", ".wav", ".flac", ".m4a"}]
    print(f"  Audio files: {len(audio_files)} found in {audio_dir}")
    return len(audio_files) > 0


def check_api_keys():
    ok = True
    if settings.genius_access_token and settings.genius_access_token != "your_genius_token_here":
        print("  Genius token: SET")
    else:
        print("  Genius token: NOT SET")
        ok = False
    if settings.anthropic_api_key and settings.anthropic_api_key != "your_anthropic_key_here":
        print("  Anthropic key: SET")
    else:
        print("  Anthropic key: NOT SET")
        ok = False
    return ok


async def main():
    print("=== Raag Setup Verification ===\n")

    print("[Services]")
    pg_ok = await check_postgres()
    qd_ok = check_qdrant()
    rd_ok = check_redis()

    print("\n[Data]")
    audio_ok = check_audio_files()

    print("\n[API Keys]")
    keys_ok = check_api_keys()

    print("\n[Summary]")
    all_ok = pg_ok and qd_ok and rd_ok and keys_ok
    if all_ok:
        print("All critical checks passed!")
    else:
        print("Some checks failed. Fix issues above before ingesting.")

    if not audio_ok:
        print("Note: Audio files not found. Place them in data/audio/seedhe-maut/nayaab/")


if __name__ == "__main__":
    asyncio.run(main())
