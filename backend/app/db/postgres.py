import uuid
from datetime import datetime

from sqlalchemy import (
    ARRAY,
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

from app.config import settings

engine = create_async_engine(settings.database_url, echo=False)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class Artist(TimestampMixin, Base):
    __tablename__ = "artists"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    genius_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    metadata_: Mapped[dict | None] = mapped_column("metadata", JSONB, nullable=True)

    albums: Mapped[list["Album"]] = relationship(back_populates="artist", cascade="all, delete")


class Album(TimestampMixin, Base):
    __tablename__ = "albums"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    artist_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("artists.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(255), nullable=False)
    release_year: Mapped[int | None] = mapped_column(Integer, nullable=True)
    genius_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    cover_art_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    metadata_: Mapped[dict | None] = mapped_column("metadata", JSONB, nullable=True)

    artist: Mapped["Artist"] = relationship(back_populates="albums")
    songs: Mapped[list["Song"]] = relationship(back_populates="album", cascade="all, delete")


class Song(TimestampMixin, Base):
    __tablename__ = "songs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    album_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("albums.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    track_number: Mapped[int | None] = mapped_column(Integer, nullable=True)
    genius_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    genius_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    audio_path: Mapped[str | None] = mapped_column(Text, nullable=True)
    duration_seconds: Mapped[float | None] = mapped_column(Float, nullable=True)
    tempo_bpm: Mapped[float | None] = mapped_column(Float, nullable=True)
    key: Mapped[str | None] = mapped_column(String(10), nullable=True)
    energy: Mapped[float | None] = mapped_column(Float, nullable=True)
    spectral_centroid: Mapped[float | None] = mapped_column(Float, nullable=True)
    onset_density: Mapped[float | None] = mapped_column(Float, nullable=True)
    mood_energy: Mapped[float | None] = mapped_column(Float, nullable=True)
    primary_topics: Mapped[list[str] | None] = mapped_column(ARRAY(Text), nullable=True)
    secondary_tags: Mapped[list[str] | None] = mapped_column(ARRAY(Text), nullable=True)
    metadata_: Mapped[dict | None] = mapped_column("metadata", JSONB, nullable=True)

    album: Mapped["Album"] = relationship(back_populates="songs")
    lyrics: Mapped["Lyrics | None"] = relationship(back_populates="song", cascade="all, delete", uselist=False)
    bars: Mapped[list["Bar"]] = relationship(back_populates="song", cascade="all, delete")
    entity_mentions: Mapped[list["EntityMention"]] = relationship(back_populates="song", cascade="all, delete")
    feature_artists: Mapped[list["FeatureArtist"]] = relationship(back_populates="song", cascade="all, delete")


class Lyrics(TimestampMixin, Base):
    __tablename__ = "lyrics"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    song_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("songs.id"), unique=True, nullable=False)
    full_text: Mapped[str] = mapped_column(Text, nullable=False)
    word_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    unique_word_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    lexical_diversity: Mapped[float | None] = mapped_column(Float, nullable=True)
    source: Mapped[str] = mapped_column(String(50), default="genius")
    metadata_: Mapped[dict | None] = mapped_column("metadata", JSONB, nullable=True)

    song: Mapped["Song"] = relationship(back_populates="lyrics")


class Bar(TimestampMixin, Base):
    __tablename__ = "bars"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    song_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("songs.id"), nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    bar_index: Mapped[int] = mapped_column(Integer, nullable=False)
    section: Mapped[str | None] = mapped_column(String(100), nullable=True)
    section_index: Mapped[int | None] = mapped_column(Integer, nullable=True)
    mc: Mapped[str | None] = mapped_column(String(100), nullable=True)
    annotations: Mapped[list[str] | None] = mapped_column(ARRAY(Text), nullable=True)
    punchline_explanation: Mapped[str | None] = mapped_column(Text, nullable=True)
    reference_target: Mapped[str | None] = mapped_column(Text, nullable=True)
    rhyme_group: Mapped[str | None] = mapped_column(String(10), nullable=True)
    metadata_: Mapped[dict | None] = mapped_column("metadata", JSONB, nullable=True)

    song: Mapped["Song"] = relationship(back_populates="bars")


class EntityMention(TimestampMixin, Base):
    __tablename__ = "entity_mentions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    song_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("songs.id"), nullable=False)
    entity_type: Mapped[str] = mapped_column(String(50), nullable=False)
    entity_name: Mapped[str] = mapped_column(String(255), nullable=False)
    context: Mapped[str | None] = mapped_column(Text, nullable=True)
    stance: Mapped[str | None] = mapped_column(String(50), nullable=True)
    metadata_: Mapped[dict | None] = mapped_column("metadata", JSONB, nullable=True)

    song: Mapped["Song"] = relationship(back_populates="entity_mentions")


class FeatureArtist(TimestampMixin, Base):
    __tablename__ = "feature_artists"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    song_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("songs.id"), nullable=False)
    artist_name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str | None] = mapped_column(String(50), nullable=True)
    metadata_: Mapped[dict | None] = mapped_column("metadata", JSONB, nullable=True)

    song: Mapped["Song"] = relationship(back_populates="feature_artists")


class HumanCorrection(TimestampMixin, Base):
    __tablename__ = "human_corrections"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    table_name: Mapped[str] = mapped_column(String(100), nullable=False)
    record_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    field_name: Mapped[str] = mapped_column(String(100), nullable=False)
    old_value: Mapped[str | None] = mapped_column(Text, nullable=True)
    new_value: Mapped[str] = mapped_column(Text, nullable=False)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    applied: Mapped[bool] = mapped_column(Boolean, default=False)


async def get_session() -> AsyncSession:
    async with async_session() as session:
        yield session
