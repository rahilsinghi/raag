"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import type { SongResult, SongDetail } from "@/lib/types";
import { TOPIC_COLORS } from "@/lib/constants";
import { Gauge, Piano, Zap, Loader2, Network } from "lucide-react";
import { getAlbumArt } from "@/lib/album-art";
import { fetchSongDetail } from "@/lib/api";
import { SongDetailPanel } from "./SongDetailPanel";
import { PlayButton } from "@/components/spotify/PlayButton";

interface Props {
  song: SongResult;
  rank?: number;
  cascadeIndex?: number;
}

export function SongCard({ song, rank, cascadeIndex = 0 }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [detail, setDetail] = useState<SongDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const energyPct = song.energy ? Math.round(song.energy * 100) : 0;
  const scorePct = Math.round(song.score * 100);
  const albumArt = getAlbumArt(song.album_title || "");

  const openDetail = useCallback(async () => {
    setExpanded(true);
    if (!detail && !loading) {
      setLoading(true);
      try {
        const data = await fetchSongDetail(song.id);
        setDetail(data);
      } catch (e) {
        console.error("Failed to fetch song detail:", e);
      } finally {
        setLoading(false);
      }
    }
  }, [detail, loading, song.id]);

  const handleMouseEnter = useCallback(() => {
    hoverTimerRef.current = setTimeout(openDetail, 400);
  }, [openDetail]);

  const handleMouseLeave = useCallback(() => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    setExpanded(false);
  }, []);

  const handleClick = useCallback((e: React.MouseEvent) => {
    // Don't trigger card expand when clicking play button
    if ((e.target as HTMLElement).closest('button')) {
      // Also cancel hover-expand timer so card doesn't open after play
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
        hoverTimerRef.current = null;
      }
      return;
    }
    if (expanded) {
      setExpanded(false);
    } else {
      openDetail();
    }
  }, [expanded, openDetail]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    };
  }, []);

  return (
    <div
      ref={wrapperRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="animate-cascade-in"
      style={{ animationDelay: `${cascadeIndex * 0.08}s` }}
    >
      <div
        className={`group glass-card overflow-hidden transition-all duration-300 ${
          expanded
            ? "rounded-xl ring-1 ring-[#d91d1c]/20"
            : "rounded-xl"
        }`}
      >
        {/* Main card */}
        <div className="px-4 py-3 cursor-pointer" onClick={handleClick}>
          <div className="flex items-start gap-3">
            {/* Album art thumbnail */}
            <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-white/[0.03]">
              {albumArt ? (
                <Image
                  src={albumArt}
                  alt={song.album_title || "Album"}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-white/10 text-lg font-bold font-maut">
                    {rank ? String(rank).padStart(2, "0") : "?"}
                  </span>
                </div>
              )}
            </div>

            {/* Song info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <h4 className="font-bold text-sm text-white truncate min-w-0">
                      {song.title}
                    </h4>
                    <div className="shrink-0 flex items-center gap-1">
                      <PlayButton spotifyTrackId={song.spotify_track_id} songId={song.id} size="sm" />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/universe?song=${song.id}`);
                        }}
                        className="w-6 h-6 rounded-full bg-white/[0.04] flex items-center justify-center text-white/25 hover:text-white/60 hover:bg-white/[0.08] transition-all duration-300"
                        title="View in Universe"
                      >
                        <Network className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-white/40 mt-0.5">
                    {song.album_title}
                    {song.track_number && (
                      <span className="text-white/20">
                        {" "}
                        · Track {song.track_number}
                      </span>
                    )}
                  </p>
                </div>

                {/* Match score */}
                <div className="relative w-10 h-10 shrink-0">
                  <svg
                    className="w-10 h-10 -rotate-90"
                    viewBox="0 0 36 36"
                  >
                    <circle
                      cx="18"
                      cy="18"
                      r="14"
                      fill="none"
                      stroke="rgba(255,255,255,0.06)"
                      strokeWidth="2.5"
                    />
                    <circle
                      cx="18"
                      cy="18"
                      r="14"
                      fill="none"
                      stroke="#d91d1c"
                      strokeWidth="2.5"
                      strokeDasharray={`${scorePct * 0.88} 88`}
                      strokeLinecap="round"
                      style={{
                        filter: "drop-shadow(0 0 4px rgba(217,29,28,0.4))",
                      }}
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white/80">
                    {scorePct}
                  </span>
                </div>
              </div>

              {/* Stats row */}
              <div className="flex items-center gap-4 mt-2.5 text-[11px] text-white/35">
                {song.tempo_bpm && (
                  <div className="flex items-center gap-1.5">
                    <Gauge className="w-3 h-3" />
                    <span>{Math.round(song.tempo_bpm)} BPM</span>
                  </div>
                )}
                {song.key && (
                  <div className="flex items-center gap-1.5">
                    <Piano className="w-3 h-3" />
                    <span>{song.key}</span>
                  </div>
                )}
                {song.energy !== null && song.energy !== undefined && (
                  <div className="flex items-center gap-1.5">
                    <Zap className="w-3 h-3" />
                    <div className="flex items-center gap-1.5">
                      <div className="w-14 h-1 bg-white/[0.06] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${energyPct}%`,
                            background:
                              "linear-gradient(90deg, #d91d1c 0%, #ff4444 100%)",
                            boxShadow: "0 0 6px rgba(217,29,28,0.3)",
                          }}
                        />
                      </div>
                      <span className="text-[10px] tabular-nums text-white/25">
                        {energyPct}%
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Topics */}
        {!expanded &&
          ((song.primary_topics?.length ?? 0) > 0 ||
            (song.secondary_tags?.length ?? 0) > 0) && (
            <div className="px-4 py-2 border-t border-white/[0.04] flex flex-wrap gap-1.5">
              {song.primary_topics?.map((topic) => (
                <Badge
                  key={topic}
                  variant="outline"
                  className={`text-[10px] font-semibold border ${
                    TOPIC_COLORS[topic] ||
                    "bg-white/[0.05] text-white/60 border-white/[0.08]"
                  }`}
                >
                  {topic}
                </Badge>
              ))}
              {song.secondary_tags?.map((tag) => (
                <Badge
                  key={tag}
                  variant="outline"
                  className="text-[10px] text-white/30 border-white/[0.05] bg-transparent"
                >
                  {tag}
                </Badge>
              ))}
            </div>
          )}

        {/* Expanded detail panel */}
        {expanded && (
          <>
            {loading && !detail && (
              <div className="flex items-center justify-center py-6 border-t border-white/[0.04]">
                <Loader2 className="w-4 h-4 text-[#d91d1c]/60 animate-spin" />
              </div>
            )}
            {detail && <SongDetailPanel song={detail} />}
          </>
        )}
      </div>
    </div>
  );
}
