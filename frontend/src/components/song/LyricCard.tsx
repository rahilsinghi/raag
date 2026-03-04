"use client";

import { useState } from "react";
import Image from "next/image";
import type { LyricResult } from "@/lib/types";
import { getAlbumArt } from "@/lib/album-art";
import { Languages } from "lucide-react";

interface Props {
  lyric: LyricResult;
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

/** Rough check: does text contain Devanagari characters? */
function isDevanagari(text: string): boolean {
  return /[\u0900-\u097F]/.test(text);
}

/** Very basic romanization of Devanagari text (for display toggle). */
function romanize(text: string): string {
  const map: Record<string, string> = {
    "अ": "a", "आ": "aa", "इ": "i", "ई": "ee", "उ": "u", "ऊ": "oo",
    "ए": "e", "ऐ": "ai", "ओ": "o", "औ": "au", "अं": "an", "अः": "ah",
    "क": "ka", "ख": "kha", "ग": "ga", "घ": "gha", "ङ": "nga",
    "च": "cha", "छ": "chha", "ज": "ja", "झ": "jha", "ञ": "nya",
    "ट": "ta", "ठ": "tha", "ड": "da", "ढ": "dha", "ण": "na",
    "त": "ta", "थ": "tha", "द": "da", "ध": "dha", "न": "na",
    "प": "pa", "फ": "pha", "ब": "ba", "भ": "bha", "म": "ma",
    "य": "ya", "र": "ra", "ल": "la", "व": "va", "श": "sha",
    "ष": "sha", "स": "sa", "ह": "ha", "क़": "qa", "ख़": "kha",
    "ग़": "ga", "ज़": "za", "फ़": "fa", "ड़": "da", "ढ़": "dha",
    "ा": "aa", "ि": "i", "ी": "ee", "ु": "u", "ू": "oo",
    "े": "e", "ै": "ai", "ो": "o", "ौ": "au",
    "्": "", "ं": "n", "ः": "h", "ँ": "n",
    "।": ".", "॥": ".", "ॐ": "om",
  };

  let result = "";
  for (let i = 0; i < text.length; i++) {
    // Try two-char combo first (for nukta combinations)
    const twoChar = text.substring(i, i + 2);
    if (map[twoChar] !== undefined) {
      result += map[twoChar];
      i++;
    } else if (map[text[i]] !== undefined) {
      result += map[text[i]];
    } else {
      result += text[i];
    }
  }
  return result;
}

export function LyricCard({ lyric, cascadeIndex = 0 }: Props) {
  const [showRomanized, setShowRomanized] = useState(false);
  const mc = MC_STYLES[lyric.mc ?? ""];
  const scorePct = Math.round(lyric.score * 100);
  const albumArt = getAlbumArt(lyric.album_title || "");
  const hasDevanagari = isDevanagari(lyric.text);

  // Truncate to 3 lines for compact display
  const lines = lyric.text.split("\n").filter((l) => l.trim());
  const displayLines = lines.slice(0, 3);
  const hasMore = lines.length > 3;

  const renderLine = (line: string) =>
    showRomanized && hasDevanagari ? romanize(line) : line;

  return (
    <div
      className={`glass-card rounded-lg overflow-hidden border-l-2 animate-cascade-in ${
        mc?.border || "border-l-[#d91d1c]/40"
      }`}
      style={{ animationDelay: `${cascadeIndex * 0.06}s` }}
    >
      <div className="px-3 py-2">
        {/* Header: section + score + romanize toggle */}
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            {lyric.section && (
              <span className="text-[9px] font-semibold text-white/30 uppercase tracking-wider">
                {lyric.section}
              </span>
            )}
            {lyric.mc && mc && (
              <div className="flex items-center gap-1">
                <div className={`w-1 h-1 rounded-full ${mc.dot}`} />
                <span className={`text-[9px] font-semibold ${mc.text}`}>
                  {lyric.mc}
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {hasDevanagari && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowRomanized(!showRomanized);
                }}
                className={`p-0.5 rounded transition-colors ${
                  showRomanized
                    ? "text-[#d91d1c]/80"
                    : "text-white/20 hover:text-white/40"
                }`}
                title={showRomanized ? "Show Devanagari" : "Show Romanized"}
              >
                <Languages className="w-3 h-3" />
              </button>
            )}
            <span className="text-[9px] font-bold text-[#d91d1c]/60 tabular-nums">
              {scorePct}%
            </span>
          </div>
        </div>

        {/* Lyric text — compact */}
        <div className="mb-1.5">
          {displayLines.map((line, i) => (
            <p
              key={i}
              className="text-[12px] text-white/80 leading-snug italic"
            >
              {renderLine(line)}
            </p>
          ))}
          {hasMore && (
            <span className="text-[10px] text-white/20">
              +{lines.length - 3}
            </span>
          )}
        </div>

        {/* Footer: song + album */}
        <div className="flex items-center gap-2 pt-1.5 border-t border-white/[0.03]">
          {albumArt && (
            <div className="relative w-5 h-5 rounded overflow-hidden shrink-0 bg-white/[0.03]">
              <Image
                src={albumArt}
                alt={lyric.album_title || ""}
                fill
                className="object-cover"
              />
            </div>
          )}
          <p className="text-[10px] text-white/40 truncate flex-1">
            {lyric.song_title}
            {lyric.album_title && (
              <span className="text-white/20"> · {lyric.album_title}</span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
