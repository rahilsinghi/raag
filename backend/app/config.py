from pathlib import Path

from pydantic_settings import BaseSettings

# Resolve .env from project root (parent of backend/)
_PROJECT_ROOT = Path(__file__).resolve().parents[2]
_ENV_FILE = _PROJECT_ROOT / ".env"


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://rahilsinghi@localhost:5432/raag"
    qdrant_host: str = "localhost"
    qdrant_port: int = 6333
    redis_url: str = "redis://localhost:6379/0"
    genius_access_token: str = ""
    anthropic_api_key: str = ""
    audio_base_path: str = str(_PROJECT_ROOT / "data" / "audio")
    clap_model: str = "laion/larger_clap_music_and_speech"
    lyrics_embed_model: str = "paraphrase-multilingual-MiniLM-L12-v2"
    zero_shot_model: str = "facebook/bart-large-mnli"
    claude_model: str = "claude-sonnet-4-20250514"
    spotify_client_id: str = ""
    spotify_client_secret: str = ""
    spotify_redirect_uri: str = "https://127.0.0.1:3000/api/auth/callback/spotify"

    model_config = {"env_file": str(_ENV_FILE), "env_file_encoding": "utf-8"}


settings = Settings()
