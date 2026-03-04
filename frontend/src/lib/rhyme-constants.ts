/** Color palette for rhyme groups — 16 distinct colors */
export const RHYME_COLORS: Record<string, string> = {
  A: "#ef4444", // red
  B: "#3b82f6", // blue
  C: "#22c55e", // green
  D: "#f59e0b", // amber
  E: "#a855f7", // purple
  F: "#ec4899", // pink
  G: "#06b6d4", // cyan
  H: "#f97316", // orange
  I: "#14b8a6", // teal
  J: "#8b5cf6", // violet
  K: "#e879f9", // fuchsia
  L: "#facc15", // yellow
  M: "#fb923c", // light orange
  N: "#4ade80", // light green
  O: "#38bdf8", // light blue
  P: "#f472b6", // light pink
};

/** Get color for a rhyme group, cycling through palette if > 16 groups */
export function getRhymeColor(group: string): string {
  return RHYME_COLORS[group] || RHYME_COLORS[String.fromCharCode(65 + (group.charCodeAt(0) - 65) % 16)] || "#ffffff";
}
