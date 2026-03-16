"use client";

import { use, useEffect, useMemo } from "react";
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
import { MC_STYLES, TOPIC_COLORS } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import {
  Disc3,
  Gauge,
  Piano,
  Zap,
  Clock,
  ExternalLink,
} from "lucide-react";

const ease = [0.16, 1, 0.3, 1] as [number, number, number, number];

export default function AlbumPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const { albums, isLoading, loaded, fetchAll } = useDiscographyStore();

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const album = useMemo(
    () => albums.find((a) => a.slug === slug),
    [albums, slug]
  );

  const albumArt = album ? getAlbumArt(album.slug) : null;

  // Aggregate stats
  const stats = useMemo(() => {
    if (!album) return null;
    const tracks = album.tracks;
    const bpms = tracks.map((t) => t.tempoBpm).filter(Boolean) as number[];
    const energies = tracks.map((t) => t.energy).filter(Boolean) as number[];
    const allTopics = new Map<string, number>();
    for (const t of tracks) {
      for (const topic of t.primaryTopics) {
        allTopics.set(topic, (allTopics.get(topic) || 0) + 1);
      }
    }
    return {
      avgBpm: bpms.length ? Math.round(bpms.reduce((a, b) => a + b, 0) / bpms.length) : null,
      minBpm: bpms.length ? Math.round(Math.min(...bpms)) : null,
      maxBpm: bpms.length ? Math.round(Math.max(...bpms)) : null,
      avgEnergy: energies.length ? Math.round((energies.reduce((a, b) => a + b, 0) / energies.length) * 100) : null,
      topics: Array.from(allTopics.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([name, count]) => ({ name, count })),
    };
  }, [album]);

  if (isLoading && !loaded) {
    return (
      <main className="h-screen w-screen bg-[#050505] overflow-hidden flex flex-col">
        <AppHeader />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-[#d91d1c]/30 border-t-[#d91d1c] rounded-full animate-spin" />
            <span className="text-sm text-white/30">Loading album...</span>
          </div>
        </div>
      </main>
    );
  }

  if (!album) {
    return (
      <main className="h-screen w-screen bg-[#050505] overflow-hidden flex flex-col">
        <AppHeader />
        <div className="flex-1 flex items-center justify-center">
          <FadeIn blur>
            <p className="text-sm text-white/40">Album not found</p>
          </FadeIn>
        </div>
      </main>
    );
  }

  return (
    <main className="h-screen w-screen bg-[#050505] overflow-hidden flex flex-col relative">
      <SpotifySDK />
      <SpotifyMiniPlayer />

      {/* Blurred album art background */}
      {albumArt && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.2, ease }}
          className="absolute inset-0 z-0 pointer-events-none"
        >
          <Image
            src={albumArt}
            alt={album.title}
            fill
            className="object-cover"
            style={{ filter: "blur(80px) saturate(150%)" }}
            priority
          />
          <div className="absolute inset-0 bg-[#050505]/85" />
          <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-[#050505] to-transparent" />
        </motion.div>
      )}

      <div className="relative z-10">
        <AppHeader />
      </div>

      <div className="flex-1 overflow-y-auto relative z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-8 py-8">
          {/* Hero section */}
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 mb-10">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, ease }}
              className="relative w-48 h-48 sm:w-56 sm:h-56 rounded-xl overflow-hidden shadow-2xl shrink-0"
            >
              {albumArt ? (
                <Image src={albumArt} alt={album.title} fill className="object-cover" priority />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[#d91d1c]/20 to-transparent flex items-center justify-center">
                  <Disc3 className="w-16 h-16 text-white/10" />
                </div>
              )}
            </motion.div>

            <FadeIn delay={0.15} blur>
              <div className="text-center sm:text-left">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#d91d1c]/70 mb-1">
                  Album
                </p>
                <h1 className="font-maut text-3xl sm:text-4xl font-extrabold tracking-wider text-white">
                  {album.title}
                </h1>
                <p className="text-sm text-white/35 mt-2">
                  {album.releaseYear && `${album.releaseYear} · `}
                  {album.songCount} tracks
                  {stats?.avgBpm && ` · ${stats.avgBpm} avg BPM`}
                </p>

                {/* Topic badges */}
                {stats && stats.topics.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3 justify-center sm:justify-start">
                    {stats.topics.slice(0, 6).map((t) => (
                      <Badge
                        key={t.name}
                        variant="outline"
                        className={`text-[10px] font-semibold border ${
                          TOPIC_COLORS[t.name] || "bg-white/[0.05] text-white/60 border-white/[0.08]"
                        }`}
                      >
                        {t.name}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </FadeIn>
          </div>

          {/* Track list */}
          <FadeIn delay={0.25}>
            <div className="glass-card rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-white/[0.06]">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-white/25">
                  Tracklist
                </span>
              </div>

              {album.tracks.map((track, i) => {
                const mc = track.mcs[0];
                const mcStyle = mc ? MC_STYLES[mc] : null;
                const energyPct = track.energy ? Math.round(track.energy * 100) : 0;
                const songUuid = track.id.replace(/^song-/, "");

                return (
                  <motion.div
                    key={track.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.3 + i * 0.04, ease }}
                    className="group flex items-center gap-4 px-4 py-3 hover:bg-white/[0.03] transition-colors border-b border-white/[0.03] last:border-b-0"
                  >
                    {/* Track number */}
                    <span className="text-[12px] tabular-nums text-white/20 w-6 text-right shrink-0">
                      {track.trackNumber || "·"}
                    </span>

                    {/* MC indicator */}
                    {mcStyle && (
                      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${mcStyle.dot}`} />
                    )}

                    {/* Title + metadata */}
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/song/${songUuid}`}
                        className="text-[14px] text-white/70 group-hover:text-white transition-colors truncate block"
                      >
                        {track.title}
                      </Link>
                      <div className="flex items-center gap-3 mt-0.5">
                        {track.tempoBpm && (
                          <span className="text-[10px] text-white/20 flex items-center gap-1">
                            <Gauge className="w-2.5 h-2.5" />
                            {Math.round(track.tempoBpm)}
                          </span>
                        )}
                        {track.key && (
                          <span className="text-[10px] text-white/20 flex items-center gap-1">
                            <Piano className="w-2.5 h-2.5" />
                            {track.key}
                          </span>
                        )}
                        {track.energy != null && (
                          <div className="flex items-center gap-1">
                            <Zap className="w-2.5 h-2.5 text-white/20" />
                            <div className="w-12 h-1 bg-white/[0.06] rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${energyPct}%`,
                                  background: "linear-gradient(90deg, #d91d1c 0%, #ff4444 100%)",
                                }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Topic badges (first 2) */}
                    <div className="hidden sm:flex gap-1 shrink-0">
                      {track.primaryTopics.slice(0, 2).map((topic) => (
                        <Badge
                          key={topic}
                          variant="outline"
                          className={`text-[8px] font-semibold border ${
                            TOPIC_COLORS[topic] || "bg-white/[0.05] text-white/40 border-white/[0.06]"
                          }`}
                        >
                          {topic}
                        </Badge>
                      ))}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      <PlayButton
                        spotifyTrackId={track.spotifyTrackId}
                        songId={songUuid}
                        size="sm"
                      />
                      <Link
                        href={`/song/${songUuid}`}
                        className="p-1.5 rounded-lg text-white/15 hover:text-white/50 transition-colors"
                        title="Deep dive"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </FadeIn>

          {/* Bottom spacer */}
          <div className="h-20" />
        </div>
      </div>
    </main>
  );
}
