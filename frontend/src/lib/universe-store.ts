import { create } from "zustand";
import { toast } from "sonner";
import { fetchGraphData, refreshGraphData, fetchSongDetail } from "./api";
import type { GraphNodeData, GraphEdgeData, SongDetail } from "./types";

export type ViewMode = "full" | "album_centric" | "mc_split" | "timeline";

interface PanelHistoryEntry {
  mode: "song" | "album";
  nodeId: string;
}

interface UniverseStore {
  nodes: GraphNodeData[];
  edges: GraphEdgeData[];
  stats: Record<string, number>;
  isLoading: boolean;
  viewMode: ViewMode;
  selectedNode: GraphNodeData | null;
  hoveredNode: GraphNodeData | null;
  clickScreenPos: { x: number; y: number } | null;

  // Panel state
  panelOpen: boolean;
  panelMode: "song" | "album" | null;
  panelNodeId: string | null;
  songDetail: SongDetail | null;
  songDetailLoading: boolean;
  panelHistory: PanelHistoryEntry[];
  pendingZoomNodeId: string | null;

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

  // Panel actions
  openSongPanel: (nodeId: string) => Promise<void>;
  openAlbumPanel: (nodeId: string) => void;
  closePanel: () => void;
  panelBack: () => void;
  setPendingZoomNodeId: (id: string | null) => void;
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

  // Panel state
  panelOpen: false,
  panelMode: null,
  panelNodeId: null,
  songDetail: null,
  songDetailLoading: false,
  panelHistory: [],
  pendingZoomNodeId: null,

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
      toast.error("Failed to load graph data");
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
      toast.success("Graph refreshed");
    } catch (e) {
      console.error("Failed to refresh graph:", e);
      toast.error("Failed to refresh graph");
    } finally {
      set({ isLoading: false });
    }
  },

  selectNode: (node) =>
    set({ selectedNode: node, clickScreenPos: node ? get().clickScreenPos : null }),
  hoverNode: (node) => set({ hoveredNode: node }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setClickScreenPos: (pos) => set({ clickScreenPos: pos }),

  openSongPanel: async (nodeId: string) => {
    const { panelOpen, panelMode, panelNodeId } = get();
    const history = [...get().panelHistory];
    if (panelOpen && panelMode && panelNodeId) {
      history.push({ mode: panelMode, nodeId: panelNodeId });
    }
    set({
      panelOpen: true,
      panelMode: "song",
      panelNodeId: nodeId,
      songDetail: null,
      songDetailLoading: true,
      panelHistory: history,
    });
    try {
      const uuid = nodeId.replace(/^song-/, "");
      const detail = await fetchSongDetail(uuid);
      // Only update if still viewing this node
      if (get().panelNodeId === nodeId) {
        set({ songDetail: detail, songDetailLoading: false });
      }
    } catch (e) {
      console.error("Failed to fetch song detail:", e);
      if (get().panelNodeId === nodeId) {
        set({ songDetailLoading: false });
      }
    }
  },

  openAlbumPanel: (nodeId: string) => {
    const { panelOpen, panelMode, panelNodeId } = get();
    const history = [...get().panelHistory];
    if (panelOpen && panelMode && panelNodeId) {
      history.push({ mode: panelMode, nodeId: panelNodeId });
    }
    set({
      panelOpen: true,
      panelMode: "album",
      panelNodeId: nodeId,
      songDetail: null,
      songDetailLoading: false,
      panelHistory: history,
    });
  },

  closePanel: () => {
    set({
      panelOpen: false,
      panelMode: null,
      panelNodeId: null,
      songDetail: null,
      songDetailLoading: false,
      panelHistory: [],
      selectedNode: null,
    });
  },

  panelBack: () => {
    const history = [...get().panelHistory];
    const prev = history.pop();
    if (!prev) return;
    set({ panelHistory: history });
    // Re-open without pushing to history
    if (prev.mode === "song") {
      set({
        panelMode: "song",
        panelNodeId: prev.nodeId,
        songDetail: null,
        songDetailLoading: true,
      });
      const uuid = prev.nodeId.replace(/^song-/, "");
      fetchSongDetail(uuid)
        .then((detail) => {
          if (get().panelNodeId === prev.nodeId) {
            set({ songDetail: detail, songDetailLoading: false });
          }
        })
        .catch(() => {
          if (get().panelNodeId === prev.nodeId) {
            set({ songDetailLoading: false });
          }
        });
    } else {
      set({
        panelMode: "album",
        panelNodeId: prev.nodeId,
        songDetail: null,
        songDetailLoading: false,
      });
    }
  },

  setPendingZoomNodeId: (id) => set({ pendingZoomNodeId: id }),
}));
