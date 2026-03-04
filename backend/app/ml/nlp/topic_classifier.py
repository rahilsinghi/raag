import logging

import torch
from transformers import pipeline

from app.config import settings

logger = logging.getLogger(__name__)

PRIMARY_TOPICS = [
    "Hustle & Grind",
    "Flex",
    "Introspection",
    "Storytelling",
    "Social Commentary",
    "Romance",
    "Anger & Aggression",
    "Party & Celebration",
    "Identity & Self",
    "Loss & Pain",
]

SECONDARY_TAGS = [
    "Aggressive",
    "Chill",
    "Lyrical",
    "Melodic",
    "Dark",
    "Uplifting",
    "Experimental",
    "Traditional",
    "Boastful",
    "Vulnerable",
    "Anthemic",
]


class TopicClassifier:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def _load_model(self):
        if self._initialized:
            return
        device = 0 if torch.cuda.is_available() else ("mps" if torch.backends.mps.is_available() else -1)
        self._classifier = pipeline(
            "zero-shot-classification",
            model=settings.zero_shot_model,
            device=device,
        )
        self._initialized = True
        logger.info("TopicClassifier loaded: %s", settings.zero_shot_model)

    def classify_song(self, lyrics: str) -> dict:
        self._load_model()

        truncated = lyrics[:2000]

        primary_result = self._classifier(
            truncated,
            candidate_labels=PRIMARY_TOPICS,
            multi_label=True,
        )
        primary_topics = [
            label
            for label, score in zip(primary_result["labels"], primary_result["scores"])
            if score > 0.3
        ][:2]

        secondary_result = self._classifier(
            truncated,
            candidate_labels=SECONDARY_TAGS,
            multi_label=True,
        )
        secondary_tags = [
            label
            for label, score in zip(secondary_result["labels"], secondary_result["scores"])
            if score > 0.25
        ]

        return {
            "primary_topics": primary_topics,
            "secondary_tags": secondary_tags,
        }
