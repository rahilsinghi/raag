"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import {
  X,
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  Loader2,
  Gauge,
  Piano,
  Zap,
  Clock,
  Type,
  Hash,
  Users,
  Disc3,
  Music,
} from "lucide-react";
import { useUniverseStore } from "@/lib/universe-store";
import { getAlbumArt } from "@/lib/album-art";
import {
  TOPIC_COLORS,
  MC_STYLES,
  ANNOTATION_STYLES,
  formatDuration,
} from "@/lib/constants";
import { PlayButton } from "@/components/spotify/PlayButton";
import type { SongDetail } from "@/lib/types";

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

export function GraphSidePanel() {
  const {
    panelOpen,
    panelMode,
    panelNodeId,
    songDetail,
    songDetailLoading,
    panelHistory,
    nodes,
    edges,
    closePanel,
    panelBack,
    openSongPanel,
    selectNode,
    setPendingZoomNodeId,
  } = useUniverseStore();

  // ESC to close
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && panelOpen) closePanel();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [panelOpen, closePanel]);

  if (!panelOpen || !panelMode || !panelNodeId) return null;

  const currentNode = nodes.find((n) => n.id === panelNodeId);

  return (
    <div
      className="fixed top-[49px] right-0 bottom-0 w-[380px] z-30 flex flex-col animate-slide-panel-in"
      style={{
        background: "rgba(8,8,8,0.95)",
        backdropFilter: "blur(40px)",
        WebkitBackdropFilter: "blur(40px)",
        borderLeft: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          {panelHistory.length > 0 && (
            <button
              onClick={panelBack}
              className="p-1 rounded-md text-white/30 hover:text-white/70 hover:bg-white/[0.06] transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
          <div className="flex items-center gap-1.5">
            {panelMode === "song" ? (
              <Music className="w-3.5 h-3.5 text-white/30" />
            ) : (
              <Disc3 className="w-3.5 h-3.5 text-[#d91d1c]/60" />
            )}
            <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/30">
              {panelMode === "song" ? "Song" : "Album"}
            </span>
          </div>
        </div>
        <button
          onClick={closePanel}
          className="p-1.5 rounded-md text-white/25 hover:text-white/60 hover:bg-white/[0.06] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {panelMode === "song" ? (
          <SongPanelContent
            songDetail={songDetail}
            loading={songDetailLoading}
            nodeId={panelNodeId}
            node={currentNode}
          />
        ) : (
          <AlbumPanelContent
            nodeId={panelNodeId}
            node={currentNode}
            nodes={nodes}
            edges={edges}
            onTrackClick={(songNode) => {
              selectNode(songNode);
              setPendingZoomNodeId(songNode.id);
              openSongPanel(songNode.id);
            }}
          />
        )}
      </div>
    </div>
  );
}

// ── Song Panel Content ─────────────────────────────────────────────────────

function SongPanelContent({
  songDetail: song,
  loading,
  nodeId,
  node,
}: {
  songDetail: SongDetail | null;
  loading: boolean;
  nodeId: string;
  node: ReturnType<typeof useUniverseStore.getState>["nodes"][0] | undefined;
}) {
  const [lyricsOpen, setLyricsOpen] = useState(true);
  const [entitiesOpen, setEntitiesOpen] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-5 h-5 text-[#d91d1c]/60 animate-spin" />
      </div>
    );
  }

  if (!song) {
    return (
      <div className="flex items-center justify-center py-16 text-white/20 text-sm">
        No data available
      </div>
    );
  }

  const albumArt = getAlbumArt(song.album_title || "");
  const energyPct = song.energy ? Math.round(song.energy * 100) : 0;
  const sections = groupBarsBySection(song.bars);

  return (
    <div>
      {/* Header with album art */}
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
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-base text-white truncate min-w-0">
              {song.title}
            </h3>
            <PlayButton
              spotifyTrackId={song.spotify_track_id}
              songId={song.id}
              size="sm"
            />
          </div>
          <p className="text-xs text-white/40 mt-0.5">
            {song.album_title}
            {song.release_year && (
              <span className="text-white/20"> · {song.release_year}</span>
            )}
            {song.track_number && (
              <span className="text-white/20">
                {" "}· Track {song.track_number}
              </span>
            )}
          </p>

          {song.features && song.features.length > 0 && (
            <div className="flex items-center gap-1.5 mt-1.5">
              <Users className="w-3 h-3 text-white/25" />
              <span className="text-[11px] text-white/35">
                ft. {song.features.map((f) => f.artist_name).join(", ")}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="px-4 pb-2 flex items-center gap-3 flex-wrap">
        {song.duration_seconds && (
          <Stat icon={Clock} value={formatDuration(song.duration_seconds)} />
        )}
        {song.tempo_bpm && (
          <Stat icon={Gauge} value={`${Math.round(song.tempo_bpm)} BPM`} />
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

      {/* Energy bar */}
      {song.energy != null && (
        <div className="px-4 pb-3 flex items-center gap-2">
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

      {/* Collapsible Lyrics */}
      {sections.length > 0 && (
        <div className="border-t border-white/[0.04]">
          <button
            onClick={() => setLyricsOpen(!lyricsOpen)}
            className="w-full px-4 py-2 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
          >
            <span className="text-[10px] font-semibold text-white/25 uppercase tracking-wider">
              Lyrics
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-white/15 tabular-nums">
                {song.bars.length} bars
              </span>
              {lyricsOpen ? (
                <ChevronDown className="w-3 h-3 text-white/20" />
              ) : (
                <ChevronRight className="w-3 h-3 text-white/20" />
              )}
            </div>
          </button>
          {lyricsOpen && (
            <div className="px-4 pb-3 space-y-3">
              {sections.map((section, si) => {
                const mc = MC_STYLES[section.mc ?? ""];
                return (
                  <div key={`${section.section}-${si}`}>
                    <div className="sticky top-0 bg-[#080808]/90 backdrop-blur-sm py-1 flex items-center gap-2 z-10">
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
          )}
        </div>
      )}

      {/* Collapsible Entities */}
      {song.entities && song.entities.length > 0 && (
        <div className="border-t border-white/[0.04]">
          <button
            onClick={() => setEntitiesOpen(!entitiesOpen)}
            className="w-full px-4 py-2 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
          >
            <span className="text-[10px] font-semibold text-white/25 uppercase tracking-wider">
              Mentions
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-white/15 tabular-nums">
                {song.entities.length}
              </span>
              {entitiesOpen ? (
                <ChevronDown className="w-3 h-3 text-white/20" />
              ) : (
                <ChevronRight className="w-3 h-3 text-white/20" />
              )}
            </div>
          </button>
          {entitiesOpen && (
            <div className="px-4 pb-3 flex flex-wrap gap-1.5">
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
          )}
        </div>
      )}

      {/* Summary footer */}
      <div className="px-4 py-2 border-t border-white/[0.04] flex items-center justify-between text-[10px] text-white/20">
        <span>
          {song.bars.filter((b) => b.annotations?.length > 0).length} annotated
          bars
        </span>
        {song.entities && (
          <span>{song.entities.length} entity mentions</span>
        )}
      </div>
    </div>
  );
}

// ── Album Panel Content ────────────────────────────────────────────────────

function AlbumPanelContent({
  nodeId,
  node,
  nodes,
  edges,
  onTrackClick,
}: {
  nodeId: string;
  node: ReturnType<typeof useUniverseStore.getState>["nodes"][0] | undefined;
  nodes: ReturnType<typeof useUniverseStore.getState>["nodes"];
  edges: ReturnType<typeof useUniverseStore.getState>["edges"];
  onTrackClick: (node: ReturnType<typeof useUniverseStore.getState>["nodes"][0]) => void;
}) {
  if (!node) return null;

  const meta = node.metadata;
  const slug = (meta.slug as string) || "";
  const albumArt = getAlbumArt(slug);

  // Get tracks from graph edges
  const trackEdges = edges.filter(
    (e) => e.source === nodeId && e.type === "contains"
  );
  const trackNodes = trackEdges
    .map((e) => nodes.find((n) => n.id === e.target))
    .filter(Boolean)
    .sort((a, b) => {
      const aTrack = (a!.metadata.track_number as number) || 99;
      const bTrack = (b!.metadata.track_number as number) || 99;
      return aTrack - bTrack;
    }) as typeof nodes;

  return (
    <div>
      {/* Album header */}
      <div className="p-4 flex flex-col items-center gap-3">
        <div className="relative w-[120px] h-[120px] rounded-lg overflow-hidden bg-white/[0.03]">
          {albumArt ? (
            <Image
              src={albumArt}
              alt={node.label}
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Disc3 className="w-8 h-8 text-white/10" />
            </div>
          )}
        </div>
        <div className="text-center">
          <h3 className="font-bold text-lg text-white">{node.label}</h3>
          <div className="flex items-center justify-center gap-2 text-[11px] text-white/40 mt-1">
            {!!meta.release_year && <span>{String(meta.release_year)}</span>}
            {trackNodes.length > 0 && (
              <span>{trackNodes.length} tracks</span>
            )}
          </div>
        </div>
      </div>

      {/* Tracklist */}
      <div className="border-t border-white/[0.04]">
        <div className="px-4 py-2">
          <span className="text-[10px] font-semibold text-white/25 uppercase tracking-wider">
            Tracklist
          </span>
        </div>
        <div className="pb-3">
          {trackNodes.map((trackNode) => {
            const tm = trackNode.metadata;
            const trackNum = tm.track_number as number | undefined;
            const bpm = tm.tempo_bpm as number | undefined;
            const energy = tm.energy as number | undefined;
            const key = tm.key as string | undefined;
            const energyPct = energy ? Math.round(energy * 100) : 0;

            return (
              <button
                key={trackNode.id}
                onClick={() => onTrackClick(trackNode)}
                className="w-full px-4 py-2 flex items-center gap-3 hover:bg-white/[0.03] transition-colors text-left group"
              >
                {/* Track number */}
                <span className="text-[11px] tabular-nums text-white/20 w-5 text-right shrink-0">
                  {trackNum || "·"}
                </span>

                {/* Title + metadata */}
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] text-white/70 group-hover:text-white truncate transition-colors">
                    {trackNode.label}
                  </p>
                  <div className="flex items-center gap-3 mt-0.5">
                    {bpm && (
                      <span className="text-[10px] text-white/20">
                        {Math.round(bpm)} BPM
                      </span>
                    )}
                    {key && (
                      <span className="text-[10px] text-white/20 font-mono">
                        {key}
                      </span>
                    )}
                    {energy != null && (
                      <div className="flex items-center gap-1">
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
                      </div>
                    )}
                  </div>
                </div>

                {/* Play button */}
                <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                  <PlayButton
                    spotifyTrackId={(tm.spotify_track_id as string) || null}
                    songId={trackNode.id.replace(/^song-/, "")}
                    size="sm"
                  />
                </div>
              </button>
            );
          })}
        </div>
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
