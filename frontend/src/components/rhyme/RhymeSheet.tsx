"use client";

import { useEffect, useRef, useMemo, useState, useCallback } from "react";
import type { BarResult, SongDetail, BarDescription } from "@/lib/types";
import { useSpotifyStore } from "@/lib/spotify-store";
import { RhymeBar } from "./RhymeBar";
import { getRhymeColor } from "@/lib/rhyme-constants";

interface RhymeSheetProps {
  song: SongDetail;
  mode?: "synced" | "static";
}

export function RhymeSheet({ song, mode = "static" }: RhymeSheetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeBarRef = useRef<HTMLDivElement>(null);
  const { isPlaying, getInterpolatedPosition, currentTrackId } = useSpotifyStore();
  const [activeBarIndex, setActiveBarIndex] = useState(-1);
  const [describeCache, setDescribeCache] = useState<Record<string, BarDescription>>({});

  // Is this song currently playing on Spotify?
  const isThisSongPlaying = useMemo(() => {
    if (!currentTrackId || !song.spotify_track_id) return false;
    return currentTrackId === `spotify:track:${song.spotify_track_id}`;
  }, [currentTrackId, song.spotify_track_id]);

  // Group bars by section
  const sections = useMemo(() => {
    const result: { name: string | null; mc: string | null; bars: BarResult[] }[] = [];
    let current: (typeof result)[0] | null = null;

    for (const bar of song.bars) {
      if (!current || bar.section !== current.name) {
        current = { name: bar.section, mc: bar.mc, bars: [] };
        result.push(current);
      }
      current.bars.push(bar);
    }
    return result;
  }, [song.bars]);

  // Collect all unique rhyme groups for the legend
  const rhymeGroups = useMemo(() => {
    const groups = new Set<string>();
    for (const bar of song.bars) {
      for (const rw of bar.rhyme_words || []) {
        groups.add(rw.group);
      }
    }
    return Array.from(groups).sort();
  }, [song.bars]);

  // Update active bar based on playback position (only in synced mode)
  useEffect(() => {
    if (mode !== "synced" || !isThisSongPlaying || !isPlaying) {
      if (mode === "static") setActiveBarIndex(-1);
      return;
    }

    let rafId: number;
    const tick = () => {
      const pos = getInterpolatedPosition();
      let found = -1;
      for (const bar of song.bars) {
        if (bar.start_ms != null && bar.end_ms != null) {
          if (pos >= bar.start_ms && pos < bar.end_ms) {
            found = bar.bar_index;
            break;
          }
        }
      }
      if (found !== activeBarIndex) {
        setActiveBarIndex(found);
      }
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [mode, isThisSongPlaying, isPlaying, song.bars, activeBarIndex, getInterpolatedPosition]);

  // Auto-scroll to active bar (synced mode only)
  useEffect(() => {
    if (mode === "synced" && activeBarIndex >= 0 && activeBarRef.current) {
      activeBarRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [mode, activeBarIndex]);

  // Describe bar handler
  const handleDescribe = useCallback(
    async (barId: string): Promise<BarDescription | null> => {
      if (describeCache[barId]) return describeCache[barId];
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/songs/bars/${barId}/describe`,
          { method: "POST" }
        );
        if (!res.ok) return null;
        const data = await res.json();
        setDescribeCache((prev) => ({ ...prev, [barId]: data }));
        return data;
      } catch {
        return null;
      }
    },
    [describeCache]
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/[0.06] shrink-0">
        <h3 className="text-[13px] font-bold text-white truncate">
          {song.title}
        </h3>
        <p className="text-[10px] text-white/30 mt-0.5">
          {song.album_title}
          {song.bars.length > 0 && ` · ${song.bars.length} bars`}
          {rhymeGroups.length > 0 && ` · ${rhymeGroups.length} rhyme groups`}
        </p>

        {/* Rhyme legend */}
        {rhymeGroups.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {rhymeGroups.slice(0, 12).map((g) => (
              <span
                key={g}
                className="flex items-center gap-1 text-[9px] font-semibold"
                style={{ color: getRhymeColor(g) }}
              >
                <span
                  className="w-2 h-2 rounded-sm"
                  style={{ backgroundColor: getRhymeColor(g) + "40" }}
                />
                {g}
              </span>
            ))}
            {rhymeGroups.length > 12 && (
              <span className="text-[9px] text-white/20">
                +{rhymeGroups.length - 12}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Scrollable bars */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden"
      >
        <div className="py-2">
          {sections.map((section, sIdx) => (
            <div key={sIdx}>
              {/* Section header */}
              {section.name && (
                <div className="sticky top-0 z-10 px-4 py-1.5 bg-[#0a0a0a]/90 backdrop-blur-sm border-b border-white/[0.03]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-white/25">
                    {section.name}
                  </span>
                  {section.mc && (
                    <span
                      className="ml-2 text-[9px] font-semibold"
                      style={{
                        color: section.mc === "Encore" ? "#34d399" : "#fbbf24",
                      }}
                    >
                      {section.mc}
                    </span>
                  )}
                </div>
              )}

              {/* Bars */}
              {section.bars.map((bar) => (
                <div
                  key={bar.id}
                  ref={bar.bar_index === activeBarIndex ? activeBarRef : undefined}
                >
                  <RhymeBar
                    bar={bar}
                    isActive={bar.bar_index === activeBarIndex}
                    onDescribe={handleDescribe}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
