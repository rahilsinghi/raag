from __future__ import annotations

import time
from collections import defaultdict
from typing import Any

from fastapi import APIRouter, Query
from pydantic import BaseModel
from sqlalchemy import func, select

from app.db.postgres import (
    Album,
    Bar,
    EntityMention,
    FeatureArtist,
    Lyrics,
    Song,
    async_session,
)

router = APIRouter(prefix="/api/graph", tags=["graph"])

# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------


class GraphNode(BaseModel):
    id: str
    type: str
    label: str
    metadata: dict[str, Any] = {}


class GraphEdge(BaseModel):
    source: str
    target: str
    type: str
    metadata: dict[str, Any] = {}


class GraphData(BaseModel):
    nodes: list[GraphNode]
    edges: list[GraphEdge]
    stats: dict[str, Any] = {}


# ---------------------------------------------------------------------------
# In-memory cache
# ---------------------------------------------------------------------------
_cache: dict[str, tuple[float, GraphData]] = {}
CACHE_TTL = 300  # 5 min


def _cache_key(view_mode: str, album_id: str | None, mc: str | None) -> str:
    return f"{view_mode}:{album_id or ''}:{mc or ''}"


# ---------------------------------------------------------------------------
# Summary / trivia builders
# ---------------------------------------------------------------------------


def _song_summary(
    song: Song,
    feat_names: list[str],
    entity_stances: list[tuple[str, str | None]],
    bar_count: int,
) -> str:
    """Build a 2-3 line trivia for a song node."""
    parts: list[str] = []

    # Line 1: core identity
    topics = song.primary_topics or []
    if topics:
        parts.append(f"Themes: {', '.join(topics[:3])}.")
    if song.energy is not None:
        lvl = "high-energy" if song.energy > 0.7 else "mellow" if song.energy < 0.35 else "mid-energy"
        bpm = f" at {int(song.tempo_bpm)} BPM" if song.tempo_bpm else ""
        parts.append(f"A {lvl} track{bpm}.")

    # Line 2: features / entities
    if feat_names:
        parts.append(f"Features {', '.join(feat_names[:3])}.")
    disses = [n for n, s in entity_stances if s == "diss"]
    shoutouts = [n for n, s in entity_stances if s == "shoutout"]
    if disses:
        parts.append(f"Disses {', '.join(disses[:2])}.")
    if shoutouts:
        parts.append(f"Shouts out {', '.join(shoutouts[:2])}.")

    # Line 3: bar count
    if bar_count:
        parts.append(f"{bar_count} bars of heat.")

    return " ".join(parts[:4]) if parts else "Seedhe Maut track."


def _album_summary(album: Album, song_count: int, total_bars: int) -> str:
    parts: list[str] = []
    if album.release_year:
        parts.append(f"Released in {album.release_year}.")
    parts.append(f"{song_count} tracks, {total_bars} bars.")
    return " ".join(parts)


def _mc_summary(mc_name: str, song_count: int) -> str:
    return f"{mc_name} — one half of Seedhe Maut. Performs on {song_count} tracks in the discography."


def _entity_summary(
    name: str, entity_type: str, mention_count: int, stances: list[str | None]
) -> str:
    diss_c = sum(1 for s in stances if s == "diss")
    shout_c = sum(1 for s in stances if s == "shoutout")
    parts = [f"Mentioned {mention_count}x across the discography."]
    if diss_c:
        parts.append(f"Dissed {diss_c}x.")
    if shout_c:
        parts.append(f"Shouted out {shout_c}x.")
    if entity_type == "place":
        parts.insert(0, f"Location referenced in SM's music.")
    elif entity_type == "cultural_reference":
        parts.insert(0, f"Cultural reference in SM's bars.")
    return " ".join(parts)


def _topic_summary(topic: str, song_count: int) -> str:
    return f'"{topic}" appears as a theme across {song_count} tracks.'


def _feat_summary(name: str, song_count: int) -> str:
    return f"Featured artist on {song_count} SM track{'s' if song_count != 1 else ''}."


# ---------------------------------------------------------------------------
# Graph builder
# ---------------------------------------------------------------------------


async def _build_graph(
    view_mode: str,
    album_id: str | None = None,
    mc: str | None = None,
) -> GraphData:
    nodes: list[GraphNode] = []
    edges: list[GraphEdge] = []
    seen_nodes: set[str] = set()

    def add_node(n: GraphNode) -> None:
        if n.id not in seen_nodes:
            seen_nodes.add(n.id)
            nodes.append(n)

    async with async_session() as session:
        # --- Albums -----------------------------------------------------------
        album_q = select(Album)
        if album_id:
            album_q = album_q.where(Album.id == album_id)
        albums = (await session.execute(album_q)).scalars().all()

        album_ids = [a.id for a in albums]

        # --- Songs ------------------------------------------------------------
        song_q = select(Song).where(Song.album_id.in_(album_ids))
        songs = (await session.execute(song_q)).scalars().all()
        song_ids = [s.id for s in songs]
        song_map = {s.id: s for s in songs}

        # Pre-fetch data needed for summaries ---------------------------------

        # Bar counts per song
        bar_counts_q = (
            select(Bar.song_id, func.count(Bar.id))
            .where(Bar.song_id.in_(song_ids))
            .group_by(Bar.song_id)
        )
        bar_count_rows = (await session.execute(bar_counts_q)).all()
        bar_counts: dict[str, int] = {str(sid): cnt for sid, cnt in bar_count_rows}

        # Feature artists
        feat_q = select(FeatureArtist).where(FeatureArtist.song_id.in_(song_ids))
        feats = (await session.execute(feat_q)).scalars().all()
        feats_by_song: dict[str, list[str]] = defaultdict(list)
        for f in feats:
            feats_by_song[str(f.song_id)].append(f.artist_name)

        # Entity mentions
        ent_q = select(EntityMention).where(EntityMention.song_id.in_(song_ids))
        entities = (await session.execute(ent_q)).scalars().all()
        ents_by_song: dict[str, list[tuple[str, str | None]]] = defaultdict(list)
        for e in entities:
            ents_by_song[str(e.song_id)].append((e.entity_name, e.stance))

        # MCs from bars
        mc_q = (
            select(Bar.mc, Bar.song_id)
            .where(Bar.song_id.in_(song_ids), Bar.mc.isnot(None))
            .distinct()
        )
        mc_rows = (await session.execute(mc_q)).all()
        mc_song_map: dict[str, set[str]] = {}
        for mc_name, s_id in mc_rows:
            if mc_name:
                mc_song_map.setdefault(mc_name, set()).add(str(s_id))

        # --- Build album nodes ------------------------------------------------
        songs_per_album: dict[str, int] = defaultdict(int)
        bars_per_album: dict[str, int] = defaultdict(int)
        for s in songs:
            aid = str(s.album_id)
            songs_per_album[aid] += 1
            bars_per_album[aid] += bar_counts.get(str(s.id), 0)

        for a in albums:
            aid = str(a.id)
            add_node(
                GraphNode(
                    id=f"album-{a.id}",
                    type="album",
                    label=a.title,
                    metadata={
                        "release_year": a.release_year,
                        "cover_art_url": a.cover_art_url,
                        "slug": a.slug,
                        "song_count": songs_per_album.get(aid, 0),
                        "summary": _album_summary(
                            a, songs_per_album.get(aid, 0), bars_per_album.get(aid, 0)
                        ),
                    },
                )
            )

        # --- Build song nodes -------------------------------------------------
        for s in songs:
            sid = str(s.id)
            add_node(
                GraphNode(
                    id=f"song-{s.id}",
                    type="song",
                    label=s.title,
                    metadata={
                        "energy": s.energy,
                        "tempo_bpm": s.tempo_bpm,
                        "key": s.key,
                        "mood_energy": s.mood_energy,
                        "track_number": s.track_number,
                        "primary_topics": s.primary_topics or [],
                        "album_id": str(s.album_id),
                        "spotify_track_id": s.spotify_track_id,
                        "summary": _song_summary(
                            s,
                            feats_by_song.get(sid, []),
                            ents_by_song.get(sid, []),
                            bar_counts.get(sid, 0),
                        ),
                    },
                )
            )
            edges.append(
                GraphEdge(
                    source=f"album-{s.album_id}",
                    target=f"song-{s.id}",
                    type="contains",
                )
            )

        # --- MC nodes ---------------------------------------------------------
        if mc and mc in mc_song_map:
            filtered_mc = {mc: mc_song_map[mc]}
        elif view_mode == "mc_split" and mc:
            filtered_mc = {k: v for k, v in mc_song_map.items() if k == mc}
        else:
            filtered_mc = mc_song_map

        for mc_name, s_ids in filtered_mc.items():
            mc_node_id = f"mc-{mc_name.lower()}"
            add_node(
                GraphNode(
                    id=mc_node_id,
                    type="mc",
                    label=mc_name,
                    metadata={
                        "song_count": len(s_ids),
                        "summary": _mc_summary(mc_name, len(s_ids)),
                    },
                )
            )
            for sid in s_ids:
                edges.append(
                    GraphEdge(
                        source=mc_node_id,
                        target=f"song-{sid}",
                        type="mc_performs",
                    )
                )

        # --- Feature Artist nodes ---------------------------------------------
        feat_song_counts: dict[str, int] = defaultdict(int)
        for f in feats:
            feat_song_counts[f.artist_name.lower()] += 1

        seen_feats: set[str] = set()
        for f in feats:
            feat_key = f.artist_name.lower().replace(" ", "_")
            feat_id = f"feat-{feat_key}"
            if feat_id not in seen_feats:
                seen_feats.add(feat_id)
                add_node(
                    GraphNode(
                        id=feat_id,
                        type="feature_artist",
                        label=f.artist_name,
                        metadata={
                            "role": f.role,
                            "summary": _feat_summary(
                                f.artist_name, feat_song_counts[f.artist_name.lower()]
                            ),
                        },
                    )
                )
            edges.append(
                GraphEdge(
                    source=f"song-{f.song_id}",
                    target=feat_id,
                    type="features",
                )
            )

        # --- Entity Mention nodes ---------------------------------------------
        entity_agg: dict[str, dict] = {}
        for e in entities:
            ent_key = f"{e.entity_type}-{e.entity_name.lower().replace(' ', '_')}"
            if ent_key not in entity_agg:
                entity_agg[ent_key] = {
                    "name": e.entity_name,
                    "entity_type": e.entity_type,
                    "stances": [],
                    "count": 0,
                }
            entity_agg[ent_key]["stances"].append(e.stance)
            entity_agg[ent_key]["count"] += 1

        for e in entities:
            ent_key = f"{e.entity_type}-{e.entity_name.lower().replace(' ', '_')}"
            ent_node_id = f"entity-{ent_key}"
            ent_type_map = {
                "artist": "entity_artist",
                "place": "place",
                "cultural_reference": "cultural_ref",
            }
            node_type = ent_type_map.get(e.entity_type, "entity_artist")
            agg = entity_agg[ent_key]
            add_node(
                GraphNode(
                    id=ent_node_id,
                    type=node_type,
                    label=e.entity_name,
                    metadata={
                        "entity_type": e.entity_type,
                        "mention_count": agg["count"],
                        "summary": _entity_summary(
                            e.entity_name,
                            e.entity_type,
                            agg["count"],
                            agg["stances"],
                        ),
                    },
                )
            )
            edges.append(
                GraphEdge(
                    source=f"song-{e.song_id}",
                    target=ent_node_id,
                    type="mentions",
                    metadata={
                        "stance": e.stance,
                        "context": e.context,
                    },
                )
            )

        # --- Topic nodes ------------------------------------------------------
        topic_song_counts: dict[str, int] = defaultdict(int)
        for s in songs:
            for topic in s.primary_topics or []:
                topic_song_counts[topic] += 1

        for s in songs:
            for topic in s.primary_topics or []:
                topic_id = f"topic-{topic.lower().replace(' ', '_').replace('&', 'and')}"
                add_node(
                    GraphNode(
                        id=topic_id,
                        type="topic",
                        label=topic,
                        metadata={
                            "song_count": topic_song_counts[topic],
                            "summary": _topic_summary(topic, topic_song_counts[topic]),
                        },
                    )
                )
                edges.append(
                    GraphEdge(
                        source=f"song-{s.id}",
                        target=topic_id,
                        type="shares_topic",
                    )
                )

        # --- Stats ------------------------------------------------------------
        total_bars = sum(bar_counts.values())
        stats = {
            "albums": len(albums),
            "songs": len(songs),
            "bars": total_bars,
            "entities": len(entities),
            "features": len(feats),
            "nodes": len(nodes),
            "edges": len(edges),
        }

    return GraphData(nodes=nodes, edges=edges, stats=stats)


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.get("/data", response_model=GraphData)
async def get_graph_data(
    view_mode: str = Query("full"),
    album_id: str | None = Query(None),
    mc: str | None = Query(None),
):
    key = _cache_key(view_mode, album_id, mc)
    now = time.time()
    if key in _cache:
        ts, data = _cache[key]
        if now - ts < CACHE_TTL:
            return data

    data = await _build_graph(view_mode, album_id, mc)
    _cache[key] = (now, data)
    return data


@router.post("/refresh")
async def refresh_graph():
    _cache.clear()
    data = await _build_graph("full")
    _cache[_cache_key("full", None, None)] = (time.time(), data)
    return {"status": "refreshed", "stats": data.stats}
