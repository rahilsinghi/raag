from qdrant_client import QdrantClient
from qdrant_client.models import Distance, PointStruct, VectorParams

from app.config import settings

AUDIO_COLLECTION = "raag_audio_embeddings"
AUDIO_DIM = 512
LYRIC_COLLECTION = "raag_lyric_embeddings"
LYRIC_DIM = 384


class QdrantManager:
    def __init__(self):
        self.client = QdrantClient(host=settings.qdrant_host, port=settings.qdrant_port)

    def initialize_collections(self):
        for name, dim in [(AUDIO_COLLECTION, AUDIO_DIM), (LYRIC_COLLECTION, LYRIC_DIM)]:
            if not self.client.collection_exists(name):
                self.client.create_collection(
                    collection_name=name,
                    vectors_config=VectorParams(size=dim, distance=Distance.COSINE),
                )

    def upsert_audio_embedding(self, point_id: str, vector: list[float], payload: dict):
        self.client.upsert(
            collection_name=AUDIO_COLLECTION,
            points=[PointStruct(id=point_id, vector=vector, payload=payload)],
        )

    def upsert_lyric_embedding(self, point_id: str, vector: list[float], payload: dict):
        self.client.upsert(
            collection_name=LYRIC_COLLECTION,
            points=[PointStruct(id=point_id, vector=vector, payload=payload)],
        )

    def search_audio(self, query_vector: list[float], limit: int = 10, filters: dict | None = None):
        filter_obj = self._build_filter(filters) if filters else None
        return self.client.query_points(
            collection_name=AUDIO_COLLECTION,
            query=query_vector,
            limit=limit,
            query_filter=filter_obj,
            with_payload=True,
        )

    def search_lyrics(self, query_vector: list[float], limit: int = 10, filters: dict | None = None):
        filter_obj = self._build_filter(filters) if filters else None
        return self.client.query_points(
            collection_name=LYRIC_COLLECTION,
            query=query_vector,
            limit=limit,
            query_filter=filter_obj,
            with_payload=True,
        )

    def _build_filter(self, filters: dict):
        from qdrant_client.models import FieldCondition, Filter, MatchValue

        conditions = []
        for key, value in filters.items():
            conditions.append(FieldCondition(key=key, match=MatchValue(value=value)))
        return Filter(must=conditions)
