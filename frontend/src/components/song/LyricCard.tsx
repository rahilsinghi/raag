"use client";

import Image from "next/image";
import type { LyricResult } from "@/lib/types";
import { getAlbumArt } from "@/lib/album-art";
import { Quote } from "lucide-react";

interface Props {
  lyric: LyricResult;
  rank?: number;
  cascadeIndex?: number;
}

const MC_STYLES: Record<
  string,
  { border: string; text: string; dot: string }
> = {
  Encore: {
    border: "border-l-emerald-500/40",
    text: "text-emerald-400",
    dot: "bg-emerald-400",
  },
  Calm: {
    border: "border-l-amber-500/40",
    text: "text-amber-400",
    dot: "bg-amber-400",
  },
};

export function LyricCard({ lyric, rank, cascadeIndex = 0 }: Props) {
  const mc = MC_STYLES[lyric.mc ?? ""];
  const scorePct = Math.round(lyric.score * 100);
  const albumArt = getAlbumArt(lyric.album_title || "");

  // Truncate text to ~4 lines worth
  const lines = lyric.text.split("\n").filter((l) => l.trim());
  const displayLines = lines.slice(0, 4);
  const hasMore = lines.length > 4;

  return (
    <div
      className={`glass-card rounded-xl overflow-hidden border-l-2 animate-cascade-in ${
        mc?.border || "border-l-[#d91d1c]/40"
      }`}
      style={{ animationDelay: `${cascadeIndex * 0.08}s` }}
    >
      <div className="px-4 py-3">
        {/* Header: section + score */}
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <Quote className="w-3 h-3 text-white/15" />
            {lyric.section && (
              <span className="text-[10px] font-semibold text-white/30 uppercase tracking-wider">
                {lyric.section}
              </span>
            )}
            {lyric.chunk_type && lyric.chunk_type !== "bar" && (
              <span className="text-[10px] text-white/20 bg-white/[0.04] px-1.5 py-0.5 rounded">
                {lyric.chunk_type}
              </span>
            )}
          </div>
          <span className="text-[10px] font-bold text-[#d91d1c]/70 tabular-nums">
            {scorePct}%
          </span>
        </div>

        {/* Lyric text */}
        <div className="mb-3">
          {displayLines.map((line, i) => (
            <p
              key={i}
              className="text-sm text-white/85 leading-relaxed italic"
            >
              {line}
            </p>
          ))}
          {hasMore && (
            <span className="text-xs text-white/25 mt-1 inline-block">
              +{lines.length - 4} more lines
            </span>
          )}
        </div>

        {/* Footer: song info + MC */}
        <div className="flex items-center gap-2.5 pt-2.5 border-t border-white/[0.04]">
          {/* Album art thumbnail */}
          {albumArt && (
            <div className="relative w-8 h-8 rounded-md overflow-hidden shrink-0 bg-white/[0.03]">
              <Image
                src={albumArt}
                alt={lyric.album_title || "Album"}
                fill
                className="object-cover"
              />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white/70 truncate">
              {lyric.song_title}
            </p>
            {lyric.album_title && (
              <p className="text-[10px] text-white/30 truncate">
                {lyric.album_title}
              </p>
            )}
          </div>

          {/* MC indicator */}
          {lyric.mc && mc && (
            <div className="flex items-center gap-1.5 shrink-0">
              <div className={`w-1.5 h-1.5 rounded-full ${mc.dot}`} />
              <span className={`text-[10px] font-semibold ${mc.text}`}>
                {lyric.mc}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
