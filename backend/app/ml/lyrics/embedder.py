"""Lyrics embedder: singleton wrapper around a sentence-transformers model."""

from __future__ import annotations

import threading

import numpy as np
from sentence_transformers import SentenceTransformer

from app.config import settings
from app.ml.lyrics.chunker import LyricChunk


class LyricsEmbedder:
    """Singleton that lazily loads a multilingual sentence-transformer model.

    Uses MPS (Apple Silicon GPU) when available, otherwise falls back to CPU.
    The model produces 384-dimensional embeddings.
    """

    _instance: LyricsEmbedder | None = None
    _lock: threading.Lock = threading.Lock()

    def __new__(cls) -> LyricsEmbedder:
        if cls._instance is None:
            with cls._lock:
                # Double-checked locking
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._model = None  # type: ignore[attr-defined]
        return cls._instance

    # ── Private helpers ─────────────────────────────────────────────────

    def _get_device(self) -> str:
        """Return the best available device string."""
        try:
            import torch

            if torch.backends.mps.is_available():
                return "mps"
        except Exception:
            pass
        return "cpu"

    def _load_model(self) -> SentenceTransformer:
        """Lazily load the sentence-transformer model on first use."""
        if self._model is None:  # type: ignore[has-type]
            device = self._get_device()
            self._model = SentenceTransformer(
                settings.lyrics_embed_model, device=device
            )
        return self._model  # type: ignore[return-value]

    # ── Public API ──────────────────────────────────────────────────────

    def embed_text(self, text: str) -> np.ndarray:
        """Embed a single text string and return a 384-dim numpy array."""
        model = self._load_model()
        embedding: np.ndarray = model.encode(text, convert_to_numpy=True)
        return embedding

    def embed_batch(self, texts: list[str]) -> list[np.ndarray]:
        """Batch-encode a list of texts for efficiency."""
        model = self._load_model()
        embeddings: np.ndarray = model.encode(texts, convert_to_numpy=True)
        return [embeddings[i] for i in range(len(texts))]

    def embed_chunks(
        self, chunks: list[LyricChunk]
    ) -> list[tuple[LyricChunk, np.ndarray]]:
        """Embed every chunk and return ``(chunk, embedding)`` pairs."""
        if not chunks:
            return []

        texts = [chunk.text for chunk in chunks]
        embeddings = self.embed_batch(texts)
        return list(zip(chunks, embeddings, strict=True))
