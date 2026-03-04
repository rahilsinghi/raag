"use client";

import { Globe, Disc3, Users, Clock } from "lucide-react";
import { useUniverseStore, type ViewMode } from "@/lib/universe-store";

const VIEW_MODES: { mode: ViewMode; label: string; icon: typeof Globe }[] = [
  { mode: "full", label: "Full", icon: Globe },
  { mode: "album_centric", label: "Albums", icon: Disc3 },
  { mode: "mc_split", label: "MCs", icon: Users },
  { mode: "timeline", label: "Timeline", icon: Clock },
];

export function UniverseControls() {
  const { viewMode, setViewMode, fetchGraph, stats } = useUniverseStore();

  const handleViewChange = (mode: ViewMode) => {
    setViewMode(mode);
    if (mode !== "timeline") {
      fetchGraph({ view_mode: mode });
    }
  };

  return (
    <div className="fixed bottom-6 left-6 z-30 glass-card px-3 py-3 rounded-xl space-y-3">
      <div className="flex gap-1">
        {VIEW_MODES.map(({ mode, label, icon: Icon }) => (
          <button
            key={mode}
            onClick={() => handleViewChange(mode)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold tracking-wide uppercase transition-all duration-300 ${
              viewMode === mode
                ? "bg-[#d91d1c]/20 text-[#d91d1c] border border-[#d91d1c]/30"
                : "text-white/40 hover:text-white/70 hover:bg-white/[0.04] border border-transparent"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {stats.nodes != null && (
        <div className="flex gap-3 text-[10px] text-white/30 tracking-wide px-1">
          <span>{stats.nodes} nodes</span>
          <span>{stats.edges} edges</span>
        </div>
      )}
    </div>
  );
}
