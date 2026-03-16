import { create } from "zustand";
import { fetchGraphData } from "./api";
import type { GraphNodeData, GraphEdgeData } from "./types";

interface AlbumData {
  id: string;
  title: string;
  slug: string;
  releaseYear: number | null;
  coverArtUrl: string | null;
  songCount: number;
  tracks: TrackData[];
}

interface TrackData {
  id: string;
  title: string;
  trackNumber: number | null;
  tempoBpm: number | null;
  key: string | null;
  energy: number | null;
  primaryTopics: string[];
  spotifyTrackId: string | null;
  mcs: string[];
}

interface TopicData {
  name: string;
  songCount: number;
  songIds: string[];
}

interface EntityData {
  name: string;
  type: string;
  mentionCount: number;
  stance: string | null;
  songIds: string[];
}

interface DiscographyStore {
  albums: AlbumData[];
  allTracks: TrackData[];
  topics: TopicData[];
  entities: EntityData[];
  isLoading: boolean;
  loaded: boolean;
  fetchAll: () => Promise<void>;
}

export const useDiscographyStore = create<DiscographyStore>((set, get) => ({
  albums: [],
  allTracks: [],
  topics: [],
  entities: [],
  isLoading: false,
  loaded: false,

  fetchAll: async () => {
    if (get().loaded || get().isLoading) return;
    set({ isLoading: true });

    try {
      const data = await fetchGraphData({ view_mode: "full" });
      const nodes: GraphNodeData[] = data.nodes;
      const edges: GraphEdgeData[] = data.edges;

      // Build lookup maps
      const nodeMap = new Map<string, GraphNodeData>();
      for (const n of nodes) nodeMap.set(n.id, n);

      // Extract albums
      const albumNodes = nodes.filter((n: GraphNodeData) => n.type === "album");
      const songNodes = nodes.filter((n: GraphNodeData) => n.type === "song");
      const topicNodes = nodes.filter((n: GraphNodeData) => n.type === "topic");
      const entityNodes = nodes.filter(
        (n: GraphNodeData) => n.type === "entity_artist" || n.type === "place" || n.type === "cultural_ref"
      );

      // Build edges index: source -> targets by type
      const containsEdges = edges.filter((e: GraphEdgeData) => e.type === "contains");
      const mcEdges = edges.filter((e: GraphEdgeData) => e.type === "mc_performs");
      const topicEdges = edges.filter((e: GraphEdgeData) => e.type === "shares_topic");
      const mentionEdges = edges.filter((e: GraphEdgeData) => e.type === "mentions");

      // MC map: songId -> mc names
      const songMcMap = new Map<string, string[]>();
      for (const e of mcEdges) {
        const mcNode = nodeMap.get(e.source);
        if (mcNode) {
          const existing = songMcMap.get(e.target) || [];
          existing.push(mcNode.label);
          songMcMap.set(e.target, existing);
        }
      }

      // Build track data for each song
      const trackMap = new Map<string, TrackData>();
      for (const s of songNodes) {
        const m = s.metadata;
        const track: TrackData = {
          id: s.id,
          title: s.label,
          trackNumber: (m.track_number as number) ?? null,
          tempoBpm: (m.tempo_bpm as number) ?? null,
          key: (m.key as string) ?? null,
          energy: (m.energy as number) ?? null,
          primaryTopics: (m.primary_topics as string[]) ?? [],
          spotifyTrackId: (m.spotify_track_id as string) ?? null,
          mcs: songMcMap.get(s.id) || [],
        };
        trackMap.set(s.id, track);
      }

      // Build albums with tracks
      const albums: AlbumData[] = albumNodes
        .map((a) => {
          const m = a.metadata;
          const trackEdges = containsEdges.filter((e) => e.source === a.id);
          const tracks = trackEdges
            .map((e) => trackMap.get(e.target))
            .filter(Boolean) as TrackData[];
          tracks.sort((x, y) => (x.trackNumber ?? 99) - (y.trackNumber ?? 99));

          return {
            id: a.id,
            title: a.label,
            slug: (m.slug as string) || "",
            releaseYear: (m.release_year as number) ?? null,
            coverArtUrl: (m.cover_art_url as string) ?? null,
            songCount: tracks.length,
            tracks,
          };
        })
        .sort((a, b) => (b.releaseYear ?? 0) - (a.releaseYear ?? 0));

      // Build topics
      const topicSongMap = new Map<string, string[]>();
      for (const e of topicEdges) {
        const existing = topicSongMap.get(e.target) || [];
        existing.push(e.source);
        topicSongMap.set(e.target, existing);
      }
      const topics: TopicData[] = topicNodes.map((t) => ({
        name: t.label,
        songCount: (t.metadata.song_count as number) ?? 0,
        songIds: topicSongMap.get(t.id) || [],
      })).sort((a, b) => b.songCount - a.songCount);

      // Build entities
      const entitySongMap = new Map<string, string[]>();
      for (const e of mentionEdges) {
        const existing = entitySongMap.get(e.target) || [];
        existing.push(e.source);
        entitySongMap.set(e.target, existing);
      }
      const entities: EntityData[] = entityNodes.map((e) => ({
        name: e.label,
        type: e.type,
        mentionCount: (e.metadata.mention_count as number) ?? 1,
        stance: (e.metadata.stance as string) ?? null,
        songIds: entitySongMap.get(e.id) || [],
      })).sort((a, b) => b.mentionCount - a.mentionCount);

      set({
        albums,
        allTracks: Array.from(trackMap.values()),
        topics,
        entities,
        loaded: true,
      });
    } catch (e) {
      console.error("Failed to fetch discography:", e);
    } finally {
      set({ isLoading: false });
    }
  },
}));
