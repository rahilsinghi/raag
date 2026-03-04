from pydantic import BaseModel


class SongResult(BaseModel):
    id: str
    title: str
    album_title: str
    track_number: int | None = None
    tempo_bpm: float | None = None
    key: str | None = None
    energy: float | None = None
    mood_energy: float | None = None
    primary_topics: list[str] = []
    secondary_tags: list[str] = []
    score: float = 0.0


class LyricResult(BaseModel):
    song_id: str
    song_title: str
    text: str
    chunk_type: str
    section: str | None = None
    mc: str | None = None
    score: float = 0.0


class BarResult(BaseModel):
    id: str
    song_id: str
    song_title: str
    text: str
    section: str | None = None
    mc: str | None = None
    bar_index: int = 0
    annotations: list[str] = []
    punchline_explanation: str | None = None
    reference_target: str | None = None
    rhyme_group: str | None = None


class SongDetail(BaseModel):
    id: str
    title: str
    album_title: str
    track_number: int | None = None
    duration_seconds: float | None = None
    tempo_bpm: float | None = None
    key: str | None = None
    energy: float | None = None
    mood_energy: float | None = None
    primary_topics: list[str] = []
    secondary_tags: list[str] = []
    lyrics_text: str | None = None
    word_count: int | None = None
    unique_word_count: int | None = None
    lexical_diversity: float | None = None
    bars: list[BarResult] = []
    entities: list[dict] = []
    features: list[dict] = []
