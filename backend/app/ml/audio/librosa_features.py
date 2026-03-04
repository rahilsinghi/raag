"""Audio feature extraction using librosa."""

import logging

import librosa
import numpy as np

logger = logging.getLogger(__name__)

KEY_NAMES: list[str] = [
    "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"
]


class LibrosaFeatureExtractor:
    """Extracts audio features from a local file using librosa."""

    def extract_features(self, path: str) -> dict:
        """Extract a dictionary of audio features from the given file.

        Returns:
            Dict with keys:
                - duration_seconds: float
                - tempo: float (BPM)
                - key: str (estimated pitch class, e.g. "C#")
                - energy: float (mean RMS energy)
                - spectral_centroid: float (mean spectral centroid in Hz)
                - onset_density: float (onsets per second)
                - mood_energy: float (normalized 0-1 composite)
        """
        logger.info("Extracting librosa features from: %s", path)

        y, sr = librosa.load(path, sr=22050, mono=True)
        duration = librosa.get_duration(y=y, sr=sr)

        # Tempo (BPM)
        tempo_array, _ = librosa.beat.beat_track(y=y, sr=sr)
        tempo = float(np.atleast_1d(tempo_array)[0])

        # Key estimation via chroma
        chroma = librosa.feature.chroma_cqt(y=y, sr=sr)
        chroma_mean = chroma.mean(axis=1)
        key_index = int(np.argmax(chroma_mean))
        key = KEY_NAMES[key_index]

        # Energy (mean RMS)
        rms = librosa.feature.rms(y=y)
        energy = float(np.mean(rms))

        # Spectral centroid (mean)
        centroid = librosa.feature.spectral_centroid(y=y, sr=sr)
        spectral_centroid = float(np.mean(centroid))

        # Onset density (onsets per second)
        onsets = librosa.onset.onset_detect(y=y, sr=sr)
        onset_density = len(onsets) / duration if duration > 0 else 0.0

        # Mood energy: normalized 0-1 composite of tempo, energy, onset density
        # Normalizations are based on typical ranges for music
        tempo_norm = np.clip(tempo / 200.0, 0.0, 1.0)
        energy_norm = np.clip(energy / 0.3, 0.0, 1.0)
        onset_norm = np.clip(onset_density / 8.0, 0.0, 1.0)
        mood_energy = float((tempo_norm + energy_norm + onset_norm) / 3.0)

        features = {
            "duration_seconds": round(duration, 2),
            "tempo": round(tempo, 2),
            "key": key,
            "energy": round(energy, 6),
            "spectral_centroid": round(spectral_centroid, 2),
            "onset_density": round(onset_density, 4),
            "mood_energy": round(mood_energy, 4),
        }
        logger.info("Extracted features for %s: %s", path, features)
        return features
