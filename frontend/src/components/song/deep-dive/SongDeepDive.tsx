"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import type { SongDetail, BarDescription } from "@/lib/types";
import { fetchSongDetail, fetchSongTiming, describeBar } from "@/lib/api";
import { useSpotifyStore } from "@/lib/spotify-store";
import { getAlbumArt } from "@/lib/album-art";
import { AppHeader } from "@/components/layout/AppHeader";
import { PlayButton } from "@/components/spotify/PlayButton";
import { Network } from "lucide-react";
import { AnnotatedLyrics } from "./AnnotatedLyrics";
import { SongSidebar } from "./SongSidebar";
import { DeepDiveSkeleton } from "@/components/ui/glass-skeleton";
import { FadeIn } from "@/components/transitions/FadeIn";
import Link from "next/link";

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
  const describeCacheRef = useRef(describeCache);
  describeCacheRef.current = describeCache;

  const { isPlaying, getInterpolatedPosition, currentTrackId } = useSpotifyStore();

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
        // Synced timing unavailable
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

  // Describe bar handler with caching — ref avoids recreating on every cache write
  const handleDescribe = useCallback(
    async (barId: string): Promise<BarDescription | null> => {
      if (describeCacheRef.current[barId]) return describeCacheRef.current[barId];
      try {
        const data = await describeBar(barId);
        setDescribeCache((prev) => ({ ...prev, [barId]: data }));
        return data;
      } catch {
        return null;
      }
    },
    []
  );

  const albumArt = song ? getAlbumArt(song.album_title || "") : null;

  if (loading) {
    return <DeepDiveSkeleton />;
  }

  if (error || !song) {
    return (
      <div className="flex flex-col h-full">
        <AppHeader />
        <div className="flex-1 flex items-center justify-center">
          <FadeIn blur>
            <p className="text-sm text-white/40">{error || "Song not found"}</p>
          </FadeIn>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <AppHeader
        songTitle={song.title}
        songAlbum={song.album_title}
        songAlbumArt={albumArt}
        songTrackNumber={song.track_number}
        isPlayingSong={isThisSongPlaying && isPlaying}
        mode={mode}
        onModeChange={setMode}
        extraActions={
          <>
            <PlayButton spotifyTrackId={song.spotify_track_id} songId={song.id} size="sm" />
            <Link
              href={`/universe?song=${song.id}`}
              className="p-2 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/[0.04] transition-all"
              title="View in Universe"
            >
              <Network className="w-3.5 h-3.5" />
            </Link>
          </>
        }
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Main lyrics area */}
        <FadeIn className="flex-1 overflow-y-auto" delay={0.1}>
          <AnnotatedLyrics
            song={song}
            activeBarIndex={activeBarIndex}
            onDescribe={handleDescribe}
            describeCache={describeCache}
            mode={mode}
          />
        </FadeIn>

        {/* Sidebar */}
        <FadeIn
          className="hidden lg:block w-[340px] shrink-0 border-l border-white/[0.06] overflow-y-auto"
          direction="right"
          delay={0.2}
        >
          <SongSidebar song={song} />
        </FadeIn>
      </div>
    </div>
  );
}
