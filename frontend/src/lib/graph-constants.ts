export const NODE_COLORS: Record<string, string> = {
  album: "#d91d1c",
  song: "#ffffff",
  mc: "#34d399",
  feature_artist: "#60a5fa",
  entity_artist: "#c084fc",
  place: "#22d3ee",
  cultural_ref: "#fbbf24",
  topic: "#a78bfa",
};

export const NODE_SIZES: Record<string, number> = {
  album: 12,
  song: 5,
  mc: 16,
  feature_artist: 7,
  entity_artist: 6,
  place: 6,
  cultural_ref: 5,
  topic: 8,
};

export const MC_NODE_COLORS: Record<string, string> = {
  encore: "#34d399",
  calm: "#fbbf24",
};

export const EDGE_COLORS: Record<string, string> = {
  contains: "rgba(255,255,255,0.05)",
  features: "rgba(96,165,250,0.25)",
  mentions: "rgba(255,255,255,0.08)",
  shares_topic: "rgba(167,139,250,0.12)",
  mc_performs: "rgba(52,211,153,0.15)",
};

export const STANCE_EDGE_COLORS: Record<string, string> = {
  diss: "rgba(217,29,28,0.6)",
  shoutout: "rgba(52,211,153,0.4)",
  neutral: "rgba(255,255,255,0.08)",
};
