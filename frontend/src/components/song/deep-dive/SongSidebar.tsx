"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import type { SongDetail } from "@/lib/types";
import { getAlbumArt } from "@/lib/album-art";
import { TOPIC_COLORS, MC_STYLES, formatDuration } from "@/lib/constants";
import { AnimatedStat } from "./AnimatedStat";
import {
  Gauge,
  Piano,
  Zap,
  Clock,
  Type,
  Hash,
  Users,
  Music,
  Network,
} from "lucide-react";

interface Props {
  song: SongDetail;
}

export function SongSidebar({ song }: Props) {
  const albumArt = getAlbumArt(song.album_title || "");
  const energyPct = song.energy ? Math.round(song.energy * 100) : 0;
  const annotatedBars = song.bars.filter((b) => b.annotations?.length > 0);

  // Count bars per MC
  const mcCounts: Record<string, number> = {};
  for (const bar of song.bars) {
    if (bar.mc) mcCounts[bar.mc] = (mcCounts[bar.mc] || 0) + 1;
  }

  return (
    <div className="p-5 space-y-6">
      {/* Album art + title */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col items-center text-center"
      >
        <div className="relative w-40 h-40 rounded-xl overflow-hidden bg-white/[0.03] mb-4 shadow-2xl group">
          {albumArt ? (
            <Image
              src={albumArt}
              alt={song.album_title || ""}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-700"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Music className="w-10 h-10 text-white/10" />
            </div>
          )}
          {/* Gradient overlay on art */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        </div>
        <h2 className="font-bold text-lg text-white">{song.title}</h2>
        <p className="text-xs text-white/35 mt-1">
          {song.album_title}
          {song.release_year && <span> · {song.release_year}</span>}
        </p>
      </motion.div>

      {/* Stats grid with animated counters */}
      <div className="grid grid-cols-2 gap-3">
        {song.duration_seconds && (
          <AnimatedStat icon={Clock} label="Duration" value={formatDuration(song.duration_seconds)} delay={0.1} />
        )}
        {song.tempo_bpm && (
          <AnimatedStat
            icon={Gauge}
            label="Tempo"
            value={`${Math.round(song.tempo_bpm)} BPM`}
            numericValue={Math.round(song.tempo_bpm)}
            suffix=" BPM"
            delay={0.15}
          />
        )}
        {song.key && (
          <AnimatedStat icon={Piano} label="Key" value={song.key} delay={0.2} />
        )}
        {song.word_count && (
          <AnimatedStat
            icon={Type}
            label="Words"
            value={String(song.word_count)}
            numericValue={song.word_count}
            delay={0.25}
          />
        )}
        {song.lexical_diversity != null && (
          <AnimatedStat
            icon={Hash}
            label="Lexical Diversity"
            value={`${Math.round(song.lexical_diversity * 100)}%`}
            numericValue={Math.round(song.lexical_diversity * 100)}
            suffix="%"
            delay={0.3}
          />
        )}
        <AnimatedStat
          icon={Zap}
          label="Bars"
          value={String(song.bars.length)}
          numericValue={song.bars.length}
          delay={0.35}
        />
      </div>

      {/* Energy bar */}
      {song.energy != null && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-white/25">
              Energy
            </span>
            <span className="text-[11px] tabular-nums text-white/30">{energyPct}%</span>
          </div>
          <div className="h-2 bg-white/[0.04] rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${energyPct}%` }}
              transition={{ duration: 1, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="h-full rounded-full"
              style={{
                background: "linear-gradient(90deg, #d91d1c 0%, #ff4444 100%)",
                boxShadow: "0 0 8px rgba(217,29,28,0.3)",
              }}
            />
          </div>
        </motion.div>
      )}

      {/* MC Split */}
      {Object.keys(mcCounts).length > 1 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <span className="text-[10px] font-semibold uppercase tracking-wider text-white/25 block mb-2">
            MC Split
          </span>
          <div className="space-y-2">
            {Object.entries(mcCounts).map(([name, count]) => {
              const mc = MC_STYLES[name];
              const pct = Math.round((count / song.bars.length) * 100);
              return (
                <div key={name} className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${mc?.dot || "bg-white/20"}`} />
                  <span className={`text-[11px] font-semibold w-16 ${mc?.text || "text-white/40"}`}>
                    {name}
                  </span>
                  <div className="flex-1 h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.8, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
                      className="h-full rounded-full"
                      style={{
                        backgroundColor: name === "Encore" ? "#34d399" : "#fbbf24",
                      }}
                    />
                  </div>
                  <span className="text-[10px] tabular-nums text-white/25 w-12 text-right">
                    {count} ({pct}%)
                  </span>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Topics */}
      {((song.primary_topics?.length ?? 0) > 0 || (song.secondary_tags?.length ?? 0) > 0) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <span className="text-[10px] font-semibold uppercase tracking-wider text-white/25 block mb-2">
            Topics
          </span>
          <div className="flex flex-wrap gap-1.5">
            {song.primary_topics?.map((topic) => (
              <Badge
                key={topic}
                variant="outline"
                className={`text-[10px] font-semibold border ${
                  TOPIC_COLORS[topic] || "bg-white/[0.05] text-white/60 border-white/[0.08]"
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
        </motion.div>
      )}

      {/* Feature artists */}
      {song.features && song.features.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          <span className="text-[10px] font-semibold uppercase tracking-wider text-white/25 block mb-2">
            Featured Artists
          </span>
          <div className="space-y-1.5">
            {song.features.map((f, i) => (
              <div key={i} className="flex items-center gap-2">
                <Users className="w-3 h-3 text-white/20" />
                <span className="text-[12px] text-white/50">{f.artist_name}</span>
                {f.role && (
                  <span className="text-[10px] text-white/20">({f.role})</span>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Entity mentions */}
      {song.entities && song.entities.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          <span className="text-[10px] font-semibold uppercase tracking-wider text-white/25 block mb-2">
            Mentions
          </span>
          <div className="flex flex-wrap gap-1.5">
            {song.entities.map((e, i) => (
              <Link
                key={`${e.entity_name}-${i}`}
                href={`/universe?entity=${encodeURIComponent(e.entity_name)}`}
                className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border transition-colors hover:brightness-125 ${
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
                <Network className="w-2.5 h-2.5 opacity-50" />
                {e.entity_name}
              </Link>
            ))}
          </div>
        </motion.div>
      )}

      {/* Summary */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9 }}
        className="pt-4 border-t border-white/[0.04] flex items-center justify-between text-[10px] text-white/20"
      >
        <span>{annotatedBars.length} annotated bars</span>
        {song.entities && <span>{song.entities.length} mentions</span>}
      </motion.div>
    </div>
  );
}
