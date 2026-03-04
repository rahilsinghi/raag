import { create } from "zustand";
import { fetchGraphData, refreshGraphData } from "./api";
import type { GraphNodeData, GraphEdgeData } from "./types";

export type ViewMode = "full" | "album_centric" | "mc_split" | "timeline";

interface UniverseStore {
  nodes: GraphNodeData[];
  edges: GraphEdgeData[];
  stats: Record<string, number>;
  isLoading: boolean;
  viewMode: ViewMode;
  selectedNode: GraphNodeData | null;
  hoveredNode: GraphNodeData | null;
  clickScreenPos: { x: number; y: number } | null;
  fetchGraph: (params?: {
    view_mode?: string;
    album_id?: string;
    mc?: string;
  }) => Promise<void>;
  refreshGraph: () => Promise<void>;
  selectNode: (node: GraphNodeData | null) => void;
  hoverNode: (node: GraphNodeData | null) => void;
  setViewMode: (mode: ViewMode) => void;
  setClickScreenPos: (pos: { x: number; y: number } | null) => void;
}

export const useUniverseStore = create<UniverseStore>((set, get) => ({
  nodes: [],
  edges: [],
  stats: {},
  isLoading: false,
  viewMode: "full",
  selectedNode: null,
  hoveredNode: null,
  clickScreenPos: null,

  fetchGraph: async (params) => {
    set({ isLoading: true });
    try {
      const data = await fetchGraphData({
        view_mode: params?.view_mode ?? get().viewMode,
        ...params,
      });
      set({ nodes: data.nodes, edges: data.edges, stats: data.stats });
    } catch (e) {
      console.error("Failed to fetch graph:", e);
    } finally {
      set({ isLoading: false });
    }
  },

  refreshGraph: async () => {
    set({ isLoading: true });
    try {
      await refreshGraphData();
      const data = await fetchGraphData({ view_mode: get().viewMode });
      set({ nodes: data.nodes, edges: data.edges, stats: data.stats });
    } catch (e) {
      console.error("Failed to refresh graph:", e);
    } finally {
      set({ isLoading: false });
    }
  },

  selectNode: (node) =>
    set({ selectedNode: node, clickScreenPos: node ? get().clickScreenPos : null }),
  hoverNode: (node) => set({ hoveredNode: node }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setClickScreenPos: (pos) => set({ clickScreenPos: pos }),
}));
