export const TOPIC_COLORS: Record<string, string> = {
  "Hustle & Grind": "bg-amber-500/10 text-amber-400/90 border-amber-500/15",
  Flex: "bg-emerald-500/10 text-emerald-400/90 border-emerald-500/15",
  Introspection: "bg-blue-500/10 text-blue-400/90 border-blue-500/15",
  "Diss & Competition": "bg-red-500/10 text-red-400/90 border-red-500/15",
  Storytelling: "bg-purple-500/10 text-purple-400/90 border-purple-500/15",
  "Social Commentary": "bg-cyan-500/10 text-cyan-400/90 border-cyan-500/15",
  "Love & Relationships": "bg-pink-500/10 text-pink-400/90 border-pink-500/15",
  "Street Life": "bg-orange-500/10 text-orange-400/90 border-orange-500/15",
  "Unity & Brotherhood": "bg-teal-500/10 text-teal-400/90 border-teal-500/15",
  "Party & Celebration":
    "bg-yellow-500/10 text-yellow-400/90 border-yellow-500/15",
};

export const MC_STYLES: Record<
  string,
  { border: string; text: string; bg: string; dot: string }
> = {
  Encore: {
    border: "border-emerald-500/20",
    text: "text-emerald-400",
    bg: "bg-emerald-500/[0.06]",
    dot: "bg-emerald-400",
  },
  Calm: {
    border: "border-amber-500/20",
    text: "text-amber-400",
    bg: "bg-amber-500/[0.06]",
    dot: "bg-amber-400",
  },
};

export const ANNOTATION_STYLES: Record<string, { bg: string; text: string }> = {
  punchline: { bg: "bg-[#d91d1c]/10", text: "text-[#d91d1c]/90" },
  callback: { bg: "bg-blue-500/10", text: "text-blue-400/90" },
  cultural_reference: { bg: "bg-amber-500/10", text: "text-amber-400/90" },
  wordplay: { bg: "bg-emerald-500/10", text: "text-emerald-400/90" },
  flow_switch: { bg: "bg-rose-500/10", text: "text-rose-400/90" },
  key_bar: { bg: "bg-orange-500/10", text: "text-orange-400/90" },
};

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
