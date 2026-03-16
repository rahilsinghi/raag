"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { useDiscographyStore } from "@/lib/discography-store";
import { getAlbumArt } from "@/lib/album-art";
import { AppHeader } from "@/components/layout/AppHeader";
import { SpotifySDK } from "@/components/spotify/SpotifySDK";
import { SpotifyMiniPlayer } from "@/components/spotify/SpotifyMiniPlayer";
import { PlayButton } from "@/components/spotify/PlayButton";
import { FadeIn } from "@/components/transitions/FadeIn";
import { GlassSkeleton } from "@/components/ui/glass-skeleton";
import { TOPIC_COLORS, MC_STYLES } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import {
  Disc3,
  Music,
  Hash,
  Network,
  Gauge,
  Zap,
} from "lucide-react";

const ease = [0.16, 1, 0.3, 1] as [number, number, number, number];

type Tab = "albums" | "topics" | "entities";

export default function DiscographyPage() {
  const { albums, topics, entities, isLoading, loaded, fetchAll } = useDiscographyStore();
  const [tab, setTab] = useState<Tab>("albums");

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return (
    <main className="h-screen w-screen bg-[#050505] overflow-hidden flex flex-col">
      <AppHeader />
      <SpotifySDK />
      <SpotifyMiniPlayer />

      {/* Noise */}
      <div className="noise-overlay" />

      <div className="flex-1 overflow-y-auto relative z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8">
          {/* Page header */}
          <FadeIn blur>
            <div className="mb-8">
              <h1 className="font-maut text-3xl sm:text-4xl font-extrabold tracking-wider text-white">
                Discography
              </h1>
              <p className="text-sm text-white/30 mt-2">
                Seedhe Maut — every album, theme, and reference mapped.
              </p>
            </div>
          </FadeIn>

          {/* Tabs */}
          <FadeIn delay={0.1}>
            <div className="flex items-center gap-1 mb-8 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06] w-fit">
              {([
                { key: "albums" as Tab, label: "Albums", icon: Disc3 },
                { key: "topics" as Tab, label: "Topics", icon: Hash },
                { key: "entities" as Tab, label: "References", icon: Network },
              ]).map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-semibold uppercase tracking-wider transition-all duration-300 ${
                    tab === key
                      ? "bg-white/[0.08] text-white"
                      : "text-white/30 hover:text-white/60"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              ))}
            </div>
          </FadeIn>

          {/* Loading */}
          {isLoading && !loaded && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <GlassSkeleton key={i} className="h-64 rounded-xl" />
              ))}
            </div>
          )}

          {/* Albums tab */}
          {tab === "albums" && loaded && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {albums.map((album, i) => (
                <AlbumCard key={album.id} album={album} index={i} />
              ))}
            </div>
          )}

          {/* Topics tab */}
          {tab === "topics" && loaded && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {topics.map((topic, i) => (
                <motion.div
                  key={topic.name}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.05, ease }}
                  className="glass-card rounded-xl p-4 group"
                >
                  <div className="flex items-center justify-between mb-3">
                    <Badge
                      variant="outline"
                      className={`text-[11px] font-semibold border ${
                        TOPIC_COLORS[topic.name] || "bg-white/[0.05] text-white/60 border-white/[0.08]"
                      }`}
                    >
                      {topic.name}
                    </Badge>
                    <span className="text-[11px] text-white/25 tabular-nums">
                      {topic.songCount} songs
                    </span>
                  </div>
                  {/* Song count bar */}
                  <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min((topic.songCount / (topics[0]?.songCount || 1)) * 100, 100)}%` }}
                      transition={{ duration: 0.8, delay: 0.3 + i * 0.05, ease }}
                      className="h-full rounded-full"
                      style={{
                        background: "linear-gradient(90deg, #d91d1c 0%, #ff4444 100%)",
                      }}
                    />
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* Entities tab */}
          {tab === "entities" && loaded && (
            <div className="space-y-6">
              {/* Group by type */}
              {(["entity_artist", "cultural_ref", "place"] as const).map((entityType) => {
                const filtered = entities.filter((e) => e.type === entityType);
                if (filtered.length === 0) return null;
                const typeLabel = entityType === "entity_artist" ? "Artists" : entityType === "cultural_ref" ? "Cultural References" : "Places";
                return (
                  <FadeIn key={entityType} delay={0.1}>
                    <div>
                      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-white/25 mb-3">
                        {typeLabel}
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {filtered.map((entity, i) => {
                          const stanceClass =
                            entity.stance === "diss"
                              ? "border-red-500/20 text-red-400/80 bg-red-500/[0.06]"
                              : entity.stance === "shoutout"
                                ? "border-emerald-500/20 text-emerald-400/80 bg-emerald-500/[0.06]"
                                : entityType === "cultural_ref"
                                  ? "border-amber-500/20 text-amber-400/80 bg-amber-500/[0.06]"
                                  : entityType === "place"
                                    ? "border-cyan-500/20 text-cyan-400/80 bg-cyan-500/[0.06]"
                                    : "border-white/[0.08] text-white/40 bg-white/[0.02]";
                          return (
                            <motion.span
                              key={entity.name}
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ duration: 0.3, delay: i * 0.02, ease }}
                              className={`inline-flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-full border transition-all hover:brightness-125 cursor-default ${stanceClass}`}
                            >
                              {entity.name}
                              {entity.mentionCount > 1 && (
                                <span className="text-[9px] opacity-50">
                                  ×{entity.mentionCount}
                                </span>
                              )}
                            </motion.span>
                          );
                        })}
                      </div>
                    </div>
                  </FadeIn>
                );
              })}
            </div>
          )}

          {/* Bottom spacer */}
          <div className="h-20" />
        </div>
      </div>
    </main>
  );
}

function AlbumCard({ album, index }: { album: ReturnType<typeof useDiscographyStore.getState>["albums"][0]; index: number }) {
  const albumArt = getAlbumArt(album.slug);
  const avgBpm = album.tracks.reduce((sum, t) => sum + (t.tempoBpm || 0), 0) / (album.tracks.length || 1);
  const avgEnergy = album.tracks.reduce((sum, t) => sum + (t.energy || 0), 0) / (album.tracks.length || 1);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.06, ease }}
    >
      <Link
        href={`/discography/${album.slug}`}
        className="block glass-card rounded-xl overflow-hidden group"
      >
        {/* Album art hero */}
        <div className="relative h-44 overflow-hidden">
          {albumArt ? (
            <Image
              src={albumArt}
              alt={album.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-700"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#d91d1c]/20 to-transparent flex items-center justify-center">
              <Disc3 className="w-12 h-12 text-white/10" />
            </div>
          )}
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent" />

          {/* Year badge */}
          {album.releaseYear && (
            <span className="absolute top-3 right-3 text-[10px] font-bold tracking-wider text-white/50 bg-black/40 backdrop-blur-sm px-2 py-0.5 rounded-full border border-white/[0.08]">
              {album.releaseYear}
            </span>
          )}
        </div>

        {/* Info */}
        <div className="p-4">
          <h3 className="font-bold text-base text-white group-hover:text-[#d91d1c] transition-colors truncate">
            {album.title}
          </h3>
          <p className="text-[11px] text-white/30 mt-0.5">
            {album.songCount} tracks
          </p>

          {/* Stats row */}
          <div className="flex items-center gap-3 mt-3">
            {avgBpm > 0 && (
              <div className="flex items-center gap-1 text-[10px] text-white/25">
                <Gauge className="w-3 h-3" />
                <span>{Math.round(avgBpm)} avg BPM</span>
              </div>
            )}
            {avgEnergy > 0 && (
              <div className="flex items-center gap-1 text-[10px] text-white/25">
                <Zap className="w-3 h-3" />
                <span>{Math.round(avgEnergy * 100)}% energy</span>
              </div>
            )}
          </div>

          {/* Track previews */}
          <div className="mt-3 flex flex-wrap gap-1">
            {album.tracks.slice(0, 5).map((track) => {
              const mc = track.mcs[0];
              const mcStyle = mc ? MC_STYLES[mc] : null;
              return (
                <span
                  key={track.id}
                  className={`text-[9px] px-1.5 py-0.5 rounded ${
                    mcStyle ? `${mcStyle.bg} ${mcStyle.text}` : "bg-white/[0.04] text-white/30"
                  }`}
                >
                  {track.title.length > 14 ? track.title.slice(0, 12) + "…" : track.title}
                </span>
              );
            })}
            {album.tracks.length > 5 && (
              <span className="text-[9px] text-white/15 px-1.5 py-0.5">
                +{album.tracks.length - 5}
              </span>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
