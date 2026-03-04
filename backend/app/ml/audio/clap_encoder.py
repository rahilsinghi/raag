"""CLAP audio/text encoder using laion/larger_clap_music_and_speech."""

import logging
import threading

import librosa
import numpy as np
import torch
from transformers import ClapModel, ClapProcessor

from app.config import settings

logger = logging.getLogger(__name__)

CLAP_SAMPLE_RATE: int = 48000
CHUNK_DURATION: float = 30.0  # seconds
CHUNK_OVERLAP: float = 5.0    # seconds
EMBEDDING_DIM: int = 512


class CLAPEncoder:
    """Singleton encoder for CLAP audio and text embeddings.

    Uses lazy model loading to avoid heavy startup cost.
    Produces 512-dimensional L2-normalized embeddings.
    """

    _instance: "CLAPEncoder | None" = None
    _lock: threading.Lock = threading.Lock()

    def __new__(cls) -> "CLAPEncoder":
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._initialized = False
        return cls._instance

    def _ensure_loaded(self) -> None:
        """Lazily load the CLAP model and processor on first use."""
        if self._initialized:
            return

        model_name = settings.clap_model
        logger.info("Loading CLAP model: %s", model_name)

        self._device = torch.device(
            "mps" if torch.backends.mps.is_available() else "cpu"
        )
        self._processor: ClapProcessor = ClapProcessor.from_pretrained(model_name)
        self._model: ClapModel = ClapModel.from_pretrained(model_name).to(self._device)
        self._model.eval()
        self._initialized = True

        logger.info("CLAP model loaded on device: %s", self._device)

    def encode_audio(self, path: str) -> np.ndarray:
        """Encode an audio file to a 512-dim L2-normalized embedding.

        For audio longer than 30 seconds, the file is chunked into 30s
        segments with 5s overlap. Each chunk is encoded separately and
        the embeddings are averaged before normalization.

        Args:
            path: Path to an audio file.

        Returns:
            L2-normalized numpy array of shape (512,).
        """
        self._ensure_loaded()
        logger.info("Encoding audio: %s", path)

        y, sr = librosa.load(path, sr=CLAP_SAMPLE_RATE, mono=True)
        duration = len(y) / sr

        if duration <= CHUNK_DURATION:
            chunks = [y]
        else:
            chunks = self._split_chunks(y, sr)

        embeddings: list[np.ndarray] = []
        for chunk in chunks:
            inputs = self._processor(
                audio=chunk,
                sampling_rate=CLAP_SAMPLE_RATE,
                return_tensors="pt",
            )
            inputs = {k: v.to(self._device) for k, v in inputs.items()}

            with torch.no_grad():
                audio_embed = self._model.get_audio_features(**inputs)

            embeddings.append(audio_embed.cpu().numpy().squeeze())

        # Average across chunks
        mean_embedding = np.mean(embeddings, axis=0)

        # L2 normalize
        norm = np.linalg.norm(mean_embedding)
        if norm > 0:
            mean_embedding = mean_embedding / norm

        return mean_embedding.astype(np.float32)

    def encode_text(self, description: str) -> np.ndarray:
        """Encode a text description to a 512-dim L2-normalized embedding.

        Args:
            description: Free-text description of sound/music.

        Returns:
            L2-normalized numpy array of shape (512,).
        """
        self._ensure_loaded()
        logger.info("Encoding text: '%s'", description[:80])

        inputs = self._processor(text=description, return_tensors="pt")
        inputs = {k: v.to(self._device) for k, v in inputs.items()}

        with torch.no_grad():
            text_embed = self._model.get_text_features(**inputs)

        embedding = text_embed.cpu().numpy().squeeze()

        # L2 normalize
        norm = np.linalg.norm(embedding)
        if norm > 0:
            embedding = embedding / norm

        return embedding.astype(np.float32)

    def _split_chunks(self, y: np.ndarray, sr: int) -> list[np.ndarray]:
        """Split audio into overlapping chunks.

        Args:
            y: Audio time-series array.
            sr: Sample rate.

        Returns:
            List of audio chunks as numpy arrays.
        """
        chunk_samples = int(CHUNK_DURATION * sr)
        hop_samples = int((CHUNK_DURATION - CHUNK_OVERLAP) * sr)
        total_samples = len(y)

        chunks: list[np.ndarray] = []
        start = 0
        while start < total_samples:
            end = min(start + chunk_samples, total_samples)
            chunk = y[start:end]
            # Only include chunks that are at least 1 second long
            if len(chunk) >= sr:
                chunks.append(chunk)
            start += hop_samples

        return chunks
