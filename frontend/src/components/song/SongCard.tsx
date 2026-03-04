"use client";

import { Badge } from "@/components/ui/badge";
import type { SongResult } from "@/lib/types";
import { Music, Gauge, Piano, Zap } from "lucide-react";

interface Props {
  song: SongResult;
  rank?: number;
}

const TOPIC_COLORS: Record<string, string> = {
  "Hustle & Grind": "bg-amber-500/15 text-amber-300 border-amber-500/20",
  "Flex": "bg-emerald-500/15 text-emerald-300 border-emerald-500/20",
  "Introspection": "bg-blue-500/15 text-blue-300 border-blue-500/20",
  "Diss & Competition": "bg-red-500/15 text-red-300 border-red-500/20",
  "Storytelling": "bg-purple-500/15 text-purple-300 border-purple-500/20",
  "Social Commentary": "bg-cyan-500/15 text-cyan-300 border-cyan-500/20",
  "Love & Relationships": "bg-pink-500/15 text-pink-300 border-pink-500/20",
  "Street Life": "bg-orange-500/15 text-orange-300 border-orange-500/20",
  "Unity & Brotherhood": "bg-teal-500/15 text-teal-300 border-teal-500/20",
  "Party & Celebration": "bg-yellow-500/15 text-yellow-300 border-yellow-500/20",
};

export function SongCard({ song, rank }: Props) {
  const energyPct = song.energy ? Math.round(song.energy * 100) : 0;
  const scorePct = Math.round(song.score * 100);

  return (
    <div className="group rounded-xl border border-border/60 bg-card/50 hover:bg-card/80 hover:border-border transition-all duration-200 overflow-hidden">
      {/* Top section */}
      <div className="px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            {rank && (
              <span className="text-xs font-mono text-muted-foreground/50 mt-0.5 shrink-0">
                {String(rank).padStart(2, "0")}
              </span>
            )}
            <div className="min-w-0">
              <h4 className="font-semibold text-sm text-foreground truncate">
                {song.title}
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                {song.album_title}
                {song.track_number && (
                  <span className="text-muted-foreground/50">
                    {" "}· Track {song.track_number}
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Match score */}
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="relative w-9 h-9">
              <svg className="w-9 h-9 -rotate-90" viewBox="0 0 36 36">
                <circle
                  cx="18"
                  cy="18"
                  r="14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  className="text-muted/50"
                />
                <circle
                  cx="18"
                  cy="18"
                  r="14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeDasharray={`${scorePct * 0.88} 88`}
                  strokeLinecap="round"
                  className="text-primary"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold text-primary">
                {scorePct}
              </span>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
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
                <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${energyPct}%`,
                      background: `linear-gradient(90deg, oklch(0.65 0.18 280) 0%, oklch(0.72 0.20 280) 100%)`,
                    }}
                  />
                </div>
                <span className="text-[10px] tabular-nums">{energyPct}%</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Topics */}
      {((song.primary_topics?.length ?? 0) > 0 || (song.secondary_tags?.length ?? 0) > 0) && (
        <div className="px-4 py-2.5 border-t border-border/40 flex flex-wrap gap-1.5">
          {song.primary_topics?.map((topic) => (
            <Badge
              key={topic}
              variant="outline"
              className={`text-[10px] font-medium border ${
                TOPIC_COLORS[topic] || "bg-violet-500/15 text-violet-300 border-violet-500/20"
              }`}
            >
              {topic}
            </Badge>
          ))}
          {song.secondary_tags?.map((tag) => (
            <Badge
              key={tag}
              variant="outline"
              className="text-[10px] text-muted-foreground/70 border-border/40 bg-transparent"
            >
              {tag}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
