"use client";

import { useState } from "react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import type { SongDetail } from "@/lib/types";
import { getAlbumArt } from "@/lib/album-art";
import { TOPIC_COLORS, formatDuration } from "@/lib/constants";
import {
  Gauge,
  Piano,
  Zap,
  Clock,
  Type,
  ChevronDown,
  Users,
  AlignLeft,
} from "lucide-react";
import { PlayButton } from "@/components/spotify/PlayButton";
import { RhymeSheetPanel } from "@/components/rhyme/RhymeSheetPanel";

interface Props {
  song: SongDetail;
  cascadeIndex?: number;
}

export function SongContextCard({ song, cascadeIndex = 0 }: Props) {
  const [showLyrics, setShowLyrics] = useState(false);
  const [showRhymeSheet, setShowRhymeSheet] = useState(false);
  const energyPct = song.energy ? Math.round(song.energy * 100) : 0;
  const albumArt = getAlbumArt(song.album_title || "");

  // Preview first 6 lines of lyrics
  const lyricsPreview = song.lyrics_text
    ?.split("\n")
    .filter((l) => l.trim())
    .slice(0, 6);

  return (
    <div
      className="glass-card rounded-xl overflow-hidden border border-[#d91d1c]/10 animate-cascade-in"
      style={{ animationDelay: `${cascadeIndex * 0.08}s` }}
    >
      {/* Header with album art */}
      <div className="px-4 py-3 flex gap-3.5">
        <div className="relative w-16 h-16 rounded-lg overflow-hidden shrink-0 bg-white/[0.03]">
          {albumArt ? (
            <Image
              src={albumArt}
              alt={song.album_title || "Album"}
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-white/10 text-xl font-bold font-maut">
                {song.track_number || "?"}
              </span>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-base text-white truncate">
              {song.title}
            </h3>
            <PlayButton spotifyTrackId={song.spotify_track_id} songId={song.id} size="md" />
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

          {/* Feature artists */}
          {song.features && song.features.length > 0 && (
            <div className="flex items-center gap-1.5 mt-1.5">
              <Users className="w-3 h-3 text-white/25" />
              <span className="text-[11px] text-white/35">
                ft.{" "}
                {song.features.map((f) => f.artist_name).join(", ")}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Stats grid */}
      <div className="px-4 py-2.5 border-t border-white/[0.04] grid grid-cols-3 sm:grid-cols-5 gap-3">
        {song.duration_seconds && (
          <div className="flex items-center gap-1.5 text-[11px] text-white/35">
            <Clock className="w-3 h-3" />
            <span>{formatDuration(song.duration_seconds)}</span>
          </div>
        )}
        {song.tempo_bpm && (
          <div className="flex items-center gap-1.5 text-[11px] text-white/35">
            <Gauge className="w-3 h-3" />
            <span>{Math.round(song.tempo_bpm)} BPM</span>
          </div>
        )}
        {song.key && (
          <div className="flex items-center gap-1.5 text-[11px] text-white/35">
            <Piano className="w-3 h-3" />
            <span>{song.key}</span>
          </div>
        )}
        {song.energy !== null && song.energy !== undefined && (
          <div className="flex items-center gap-1.5 text-[11px] text-white/35">
            <Zap className="w-3 h-3" />
            <div className="flex items-center gap-1.5">
              <div className="w-10 h-1 bg-white/[0.06] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${energyPct}%`,
                    background:
                      "linear-gradient(90deg, #d91d1c 0%, #ff4444 100%)",
                  }}
                />
              </div>
              <span className="text-[10px] tabular-nums text-white/25">
                {energyPct}%
              </span>
            </div>
          </div>
        )}
        {song.word_count && (
          <div className="flex items-center gap-1.5 text-[11px] text-white/35">
            <Type className="w-3 h-3" />
            <span>{song.word_count} words</span>
          </div>
        )}
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

      {/* Rhyme sheet button */}
      {song.bars && song.bars.length > 0 && (
        <div className="border-t border-white/[0.04]">
          <button
            onClick={() => setShowRhymeSheet((v) => !v)}
            className="w-full px-4 py-2 flex items-center gap-2 text-xs text-white/30 hover:text-[#d91d1c]/70 transition-colors"
          >
            <AlignLeft className="w-3.5 h-3.5" />
            <span>{showRhymeSheet ? "Hide Rhyme Sheet" : "View Rhyme Sheet"}</span>
          </button>
        </div>
      )}

      {/* Rhyme sheet panel */}
      {showRhymeSheet && (
        <RhymeSheetPanel
          songId={song.id}
          onClose={() => setShowRhymeSheet(false)}
        />
      )}

      {/* Lyrics preview (collapsible) */}
      {lyricsPreview && lyricsPreview.length > 0 && (
        <div className="border-t border-white/[0.04]">
          <button
            onClick={() => setShowLyrics(!showLyrics)}
            className="w-full px-4 py-2 flex items-center justify-between text-xs text-white/30 hover:text-white/50 transition-colors"
          >
            <span>Lyrics preview</span>
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform duration-300 ${
                showLyrics ? "rotate-180" : ""
              }`}
            />
          </button>
          {showLyrics && (
            <div className="px-4 pb-3 animate-fade-in-up">
              {lyricsPreview.map((line, i) => (
                <p
                  key={i}
                  className="text-xs text-white/40 leading-relaxed italic"
                >
                  {line}
                </p>
              ))}
              {(song.lyrics_text?.split("\n").filter((l) => l.trim()).length ??
                0) > 6 && (
                <span className="text-[10px] text-white/20 mt-1 inline-block">
                  ...
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
