"use client";

import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import type { SongResult } from "@/lib/types";
import { Gauge, Piano, Zap } from "lucide-react";
import { getAlbumArt } from "@/lib/album-art";

interface Props {
  song: SongResult;
  rank?: number;
}

const TOPIC_COLORS: Record<string, string> = {
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

export function SongCard({ song, rank }: Props) {
  const energyPct = song.energy ? Math.round(song.energy * 100) : 0;
  const scorePct = Math.round(song.score * 100);
  const albumArt = getAlbumArt(song.album_title || "");

  return (
    <div className="group glass-card rounded-xl overflow-hidden animate-scale-in">
      <div className="px-4 py-3">
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
              <div className="min-w-0">
                <h4 className="font-bold text-sm text-white truncate">
                  {song.title}
                </h4>
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
      {((song.primary_topics?.length ?? 0) > 0 ||
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
    </div>
  );
}
