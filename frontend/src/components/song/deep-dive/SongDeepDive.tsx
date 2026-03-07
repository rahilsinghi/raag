"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import type { SongDetail, BarDescription } from "@/lib/types";
import { fetchSongDetail, fetchSongTiming } from "@/lib/api";
import { useSpotifyStore } from "@/lib/spotify-store";
import { SongDeepDiveHeader } from "./SongDeepDiveHeader";
import { AnnotatedLyrics } from "./AnnotatedLyrics";
import { SongSidebar } from "./SongSidebar";

interface Props {
  songId: string;
}

export function SongDeepDive({ songId }: Props) {
  const [song, setSong] = useState<SongDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"static" | "synced">("static");
  const [activeBarIndex, setActiveBarIndex] = useState(-1);
  const [describeCache, setDescribeCache] = useState<Record<string, BarDescription>>({});

  const { isPlaying, getInterpolatedPosition, currentTrackId } = useSpotifyStore();

  // Is this song currently playing?
  const isThisSongPlaying = useMemo(() => {
    if (!currentTrackId || !song?.spotify_track_id) return false;
    return currentTrackId === `spotify:track:${song.spotify_track_id}`;
  }, [currentTrackId, song?.spotify_track_id]);

  // Auto-switch to synced mode when song starts playing
  useEffect(() => {
    if (isThisSongPlaying && isPlaying && mode === "static") {
      setMode("synced");
    }
  }, [isThisSongPlaying, isPlaying, mode]);

  // Fetch song detail
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const detail = await fetchSongDetail(songId);
        if (!cancelled) setSong(detail);
      } catch {
        if (!cancelled) setError("Failed to load song");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [songId]);

  // Fetch synced timing when mode switches to synced
  useEffect(() => {
    if (mode !== "synced" || !song) return;
    // Skip if bars already have timing
    if (song.bars.some((b) => b.start_ms != null)) return;

    let cancelled = false;
    (async () => {
      try {
        const timing = await fetchSongTiming(songId, "synced");
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
        // Synced timing unavailable — stay with estimated or no timing
      }
    })();

    return () => { cancelled = true; };
  }, [mode, songId, song?.id]);

  // RAF loop for playback sync
  useEffect(() => {
    if (mode !== "synced" || !isThisSongPlaying || !isPlaying || !song) {
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
      setActiveBarIndex((prev) => (found !== prev ? found : prev));
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [mode, isThisSongPlaying, isPlaying, song, getInterpolatedPosition]);

  // Describe bar handler with caching
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#d91d1c]/30 border-t-[#d91d1c] rounded-full animate-spin" />
          <span className="text-sm text-white/30">Loading song...</span>
        </div>
      </div>
    );
  }

  if (error || !song) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm text-white/40">{error || "Song not found"}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <SongDeepDiveHeader
        song={song}
        mode={mode}
        onModeChange={setMode}
        isPlaying={isThisSongPlaying && isPlaying}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Main lyrics area */}
        <div className="flex-1 overflow-y-auto">
          <AnnotatedLyrics
            song={song}
            activeBarIndex={activeBarIndex}
            onDescribe={handleDescribe}
            describeCache={describeCache}
            mode={mode}
          />
        </div>

        {/* Sidebar */}
        <div className="hidden lg:block w-[340px] shrink-0 border-l border-white/[0.06] overflow-y-auto">
          <SongSidebar song={song} />
        </div>
      </div>
    </div>
  );
}
