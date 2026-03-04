"use client";

import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import type { SongDetail } from "@/lib/types";
import { getAlbumArt } from "@/lib/album-art";
import {
  TOPIC_COLORS,
  MC_STYLES,
  ANNOTATION_STYLES,
  formatDuration,
} from "@/lib/constants";
import {
  Gauge,
  Piano,
  Zap,
  Clock,
  Type,
  Hash,
  Users,
  Sparkles,
  Calendar,
} from "lucide-react";

interface Props {
  song: SongDetail;
}

/** Group bars by section for lyrics display */
function groupBarsBySection(
  bars: SongDetail["bars"]
): { section: string; mc: string | null; bars: SongDetail["bars"] }[] {
  const groups: {
    section: string;
    mc: string | null;
    bars: SongDetail["bars"];
  }[] = [];
  let current: (typeof groups)[0] | null = null;

  for (const bar of bars) {
    const sec = bar.section || "Unknown";
    if (!current || current.section !== sec) {
      current = { section: sec, mc: bar.mc, bars: [] };
      groups.push(current);
    }
    current.bars.push(bar);
  }
  return groups;
}

export function SongDetailPanel({ song }: Props) {
  const albumArt = getAlbumArt(song.album_title || "");
  const energyPct = song.energy ? Math.round(song.energy * 100) : 0;
  const annotatedBars = song.bars.filter(
    (b) => b.annotations && b.annotations.length > 0
  );
  const sections = groupBarsBySection(song.bars);

  return (
    <div className="animate-slide-expand origin-top border-t border-white/[0.04]">
      {/* Header */}
      <div className="p-4 flex gap-4">
        <div className="relative w-20 h-20 rounded-lg overflow-hidden shrink-0 bg-white/[0.03]">
          {albumArt ? (
            <Image
              src={albumArt}
              alt={song.album_title || "Album"}
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-white/10 text-2xl font-bold font-maut">
                {song.track_number || "?"}
              </span>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-lg text-white truncate">
            {song.title}
          </h3>
          <p className="text-xs text-white/40 mt-0.5">
            {song.album_title}
            {song.release_year && (
              <span className="text-white/20"> · {song.release_year}</span>
            )}
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
                ft. {song.features.map((f) => f.artist_name).join(", ")}
              </span>
            </div>
          )}

          {/* Stats row */}
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            {song.duration_seconds && (
              <Stat icon={Clock} value={formatDuration(song.duration_seconds)} />
            )}
            {song.tempo_bpm && (
              <Stat
                icon={Gauge}
                value={`${Math.round(song.tempo_bpm)} BPM`}
              />
            )}
            {song.key && <Stat icon={Piano} value={song.key} />}
            {song.word_count && (
              <Stat icon={Type} value={`${song.word_count} words`} />
            )}
            {song.lexical_diversity != null && (
              <Stat
                icon={Hash}
                value={`${Math.round(song.lexical_diversity * 100)}% unique`}
              />
            )}
          </div>
        </div>
      </div>

      {/* Energy bar */}
      {song.energy != null && (
        <div className="px-4 pb-2 flex items-center gap-2">
          <Zap className="w-3 h-3 text-white/25" />
          <div className="flex-1 h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${energyPct}%`,
                background:
                  "linear-gradient(90deg, #d91d1c 0%, #ff4444 100%)",
                boxShadow: "0 0 8px rgba(217,29,28,0.3)",
              }}
            />
          </div>
          <span className="text-[10px] tabular-nums text-white/25 w-8 text-right">
            {energyPct}%
          </span>
        </div>
      )}

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

      {/* Scrollable lyrics */}
      {sections.length > 0 && (
        <div className="border-t border-white/[0.04]">
          <div className="px-4 py-2 flex items-center justify-between">
            <span className="text-[10px] font-semibold text-white/25 uppercase tracking-wider">
              Lyrics
            </span>
            <span className="text-[10px] text-white/15 tabular-nums">
              {song.bars.length} bars
            </span>
          </div>
          <div className="max-h-[280px] overflow-y-auto px-4 pb-3 space-y-3">
            {sections.map((section, si) => {
              const mc = MC_STYLES[section.mc ?? ""];
              return (
                <div key={`${section.section}-${si}`}>
                  {/* Section header */}
                  <div className="sticky top-0 bg-[#050505]/90 backdrop-blur-sm py-1 flex items-center gap-2 z-10">
                    {section.mc && mc && (
                      <div
                        className={`w-1.5 h-1.5 rounded-full ${mc.dot}`}
                      />
                    )}
                    <span
                      className={`text-[9px] font-semibold uppercase tracking-wider ${
                        mc?.text || "text-white/25"
                      }`}
                    >
                      {section.section}
                    </span>
                    <div className="flex-1 h-px bg-white/[0.04]" />
                  </div>
                  {/* Bars */}
                  {section.bars.map((bar) => {
                    const hasAnn =
                      bar.annotations && bar.annotations.length > 0;
                    return (
                      <div
                        key={bar.id}
                        className={`py-0.5 ${
                          hasAnn ? "text-white/90" : "text-white/50"
                        }`}
                      >
                        <p className="text-[12px] leading-relaxed">
                          {bar.text}
                          {hasAnn && (
                            <span className="inline-flex gap-1 ml-1.5 align-middle">
                              {bar.annotations.map((ann) => {
                                const style = ANNOTATION_STYLES[ann];
                                return (
                                  <span
                                    key={ann}
                                    className={`inline-block text-[8px] font-semibold px-1 py-0 rounded ${
                                      style
                                        ? `${style.bg} ${style.text}`
                                        : "bg-white/[0.05] text-white/40"
                                    }`}
                                  >
                                    {ann.replace(/_/g, " ")}
                                  </span>
                                );
                              })}
                            </span>
                          )}
                        </p>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Entity mentions */}
      {song.entities && song.entities.length > 0 && (
        <div className="border-t border-white/[0.04] px-4 py-2.5">
          <span className="text-[10px] font-semibold text-white/25 uppercase tracking-wider">
            Mentions
          </span>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {song.entities.map((e, i) => (
              <span
                key={`${e.entity_name}-${i}`}
                className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border ${
                  e.stance === "diss"
                    ? "border-red-500/20 text-red-400/80 bg-red-500/[0.06]"
                    : e.stance === "shoutout"
                      ? "border-emerald-500/20 text-emerald-400/80 bg-emerald-500/[0.06]"
                      : e.entity_type === "cultural_reference"
                        ? "border-amber-500/20 text-amber-400/80 bg-amber-500/[0.06]"
                        : e.entity_type === "place"
                          ? "border-cyan-500/20 text-cyan-400/80 bg-cyan-500/[0.06]"
                          : "border-white/[0.08] text-white/40 bg-white/[0.02]"
                }`}
                title={e.context || undefined}
              >
                {e.entity_name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Summary footer */}
      <div className="px-4 py-2 border-t border-white/[0.04] flex items-center justify-between text-[10px] text-white/20">
        <span>{annotatedBars.length} annotated bars</span>
        {song.entities && (
          <span>{song.entities.length} entity mentions</span>
        )}
      </div>
    </div>
  );
}

/** Tiny stat display */
function Stat({
  icon: Icon,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  value: string;
}) {
  return (
    <div className="flex items-center gap-1 text-[11px] text-white/30">
      <Icon className="w-3 h-3" />
      <span>{value}</span>
    </div>
  );
}
