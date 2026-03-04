"use client";

import { useEffect, useState } from "react";
import { X, AlignLeft } from "lucide-react";
import type { SongDetail } from "@/lib/types";
import { fetchSongDetail, fetchSongTiming } from "@/lib/api";
import { RhymeSheet } from "./RhymeSheet";

interface RhymeSheetPanelProps {
  songId?: string;
  onClose: () => void;
}

export function RhymeSheetPanel({ songId, onClose }: RhymeSheetPanelProps) {
  const [song, setSong] = useState<SongDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"synced" | "static">("static");

  const resolvedSongId = songId || null;

  // Load song detail
  useEffect(() => {
    if (!resolvedSongId) {
      setError("No song selected");
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const detail = await fetchSongDetail(resolvedSongId);
        if (!cancelled) setSong(detail);
      } catch (e) {
        console.error("RhymeSheetPanel: failed to load song", resolvedSongId, e);
        if (!cancelled) setError("Failed to load song");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [resolvedSongId]);

  // When switching to synced mode, fetch synced timing from LRCLIB
  useEffect(() => {
    if (mode !== "synced" || !resolvedSongId || !song) return;

    let cancelled = false;
    (async () => {
      try {
        const timing = await fetchSongTiming(resolvedSongId, "synced");
        if (cancelled || !timing.bars) return;

        const timingMap = new Map<number, { start_ms: number; end_ms: number }>();
        for (const t of timing.bars) {
          timingMap.set(t.bar_index, { start_ms: t.start_ms, end_ms: t.end_ms });
        }

        setSong((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            bars: prev.bars.map((bar) => {
              const t = timingMap.get(bar.bar_index);
              return t ? { ...bar, start_ms: t.start_ms, end_ms: t.end_ms } : bar;
            }),
          };
        });
      } catch {
        // Synced timing not available — stay in static-like behavior
      }
    })();

    return () => { cancelled = true; };
  }, [mode, resolvedSongId, song?.id]);

  // ESC to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed bottom-20 right-4 z-[60] w-[400px] max-w-[calc(100vw-2rem)] h-[70vh] max-h-[600px]
        flex flex-col rounded-2xl border border-white/[0.08] overflow-hidden animate-slide-up-in"
      style={{
        background: "rgba(10, 10, 10, 0.95)",
        backdropFilter: "blur(30px) saturate(150%)",
        WebkitBackdropFilter: "blur(30px) saturate(150%)",
        boxShadow:
          "0 -10px 60px rgba(0, 0, 0, 0.6), 0 0 30px rgba(217, 29, 28, 0.05), inset 0 0 20px rgba(255, 255, 255, 0.02)",
      }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06] shrink-0">
        <div className="flex items-center gap-2">
          <AlignLeft className="w-3.5 h-3.5 text-[#d91d1c]" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-white/40">
            Rhyme Sheet
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Mode toggle */}
          <div className="flex items-center rounded-full bg-white/[0.04] p-0.5">
            <button
              onClick={() => setMode("static")}
              className={`px-2.5 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wider transition-all ${
                mode === "static"
                  ? "bg-white/[0.08] text-white/70"
                  : "text-white/25 hover:text-white/40"
              }`}
            >
              Static
            </button>
            <button
              onClick={() => setMode("synced")}
              className={`px-2.5 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wider transition-all ${
                mode === "synced"
                  ? "bg-white/[0.08] text-white/70"
                  : "text-white/25 hover:text-white/40"
              }`}
            >
              Synced
            </button>
          </div>

          {/* Close */}
          <button
            onClick={onClose}
            className="p-1 rounded-full text-white/30 hover:text-white/60 hover:bg-white/[0.06] transition-colors"
            aria-label="Close rhyme sheet"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-2">
              <div className="w-5 h-5 border-2 border-[#d91d1c]/30 border-t-[#d91d1c] rounded-full animate-spin" />
              <span className="text-[11px] text-white/30">Loading lyrics...</span>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-[12px] text-white/30">{error}</p>
          </div>
        ) : song ? (
          <RhymeSheet song={song} mode={mode} />
        ) : null}
      </div>
    </div>
  );
}
