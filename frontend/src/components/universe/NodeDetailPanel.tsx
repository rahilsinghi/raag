"use client";

import { useState, useEffect } from "react";
import { X, Disc3, Music, Mic2, MapPin, Bookmark, Tag, Zap, Gauge } from "lucide-react";
import { useUniverseStore } from "@/lib/universe-store";
import { NODE_COLORS } from "@/lib/graph-constants";
import { PlayButton } from "@/components/spotify/PlayButton";

const TYPE_ICONS: Record<string, typeof Disc3> = {
  album: Disc3,
  song: Music,
  mc: Mic2,
  feature_artist: Mic2,
  entity_artist: Mic2,
  place: MapPin,
  cultural_ref: Bookmark,
  topic: Tag,
};

const TYPE_LABELS: Record<string, string> = {
  album: "Album",
  song: "Song",
  mc: "MC",
  feature_artist: "Featured Artist",
  entity_artist: "Referenced Artist",
  place: "Place",
  cultural_ref: "Cultural Reference",
  topic: "Topic",
};

export function NodeDetailPanel() {
  const { selectedNode, selectNode, clickScreenPos } = useUniverseStore();
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);
  const [displayedNode, setDisplayedNode] = useState(selectedNode);

  // ESC key dismisses panel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && selectedNode) selectNode(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedNode, selectNode]);

  // Handle open/close with exit animation
  useEffect(() => {
    if (selectedNode && clickScreenPos) {
      setClosing(false);
      setDisplayedNode(selectedNode);

      const bubbleW = 288;
      const bubbleH = 260;
      let x = clickScreenPos.x + 24;
      let y = clickScreenPos.y - 60;

      if (typeof window !== "undefined") {
        if (x + bubbleW > window.innerWidth - 16) x = clickScreenPos.x - bubbleW - 24;
        if (y + bubbleH > window.innerHeight - 16) y = window.innerHeight - bubbleH - 16;
        if (y < 64) y = 64;
        if (x < 16) x = 16;
      }

      setPos({ top: y, left: x });
      setVisible(true);
    } else if (visible) {
      // Trigger exit animation
      setClosing(true);
    }
  }, [selectedNode, clickScreenPos, visible]);

  const handleAnimationEnd = () => {
    if (closing) {
      setVisible(false);
      setClosing(false);
      setDisplayedNode(null);
      setPos(null);
    }
  };

  if (!displayedNode || !pos || !visible) return null;

  const node = displayedNode;
  const Icon = TYPE_ICONS[node.type] || Tag;
  const color = NODE_COLORS[node.type] || "#ffffff";
  const meta = node.metadata;
  const summary = (meta.summary as string) || null;

  return (
    <div
      className={`fixed z-40 w-[280px] pointer-events-auto ${closing ? "animate-scale-out" : "animate-scale-in"}`}
      style={{
        top: pos.top,
        left: pos.left,
        transformOrigin: "top left",
      }}
      onAnimationEnd={handleAnimationEnd}
    >
      <div
        className="rounded-2xl border p-4 space-y-3 shadow-2xl backdrop-blur-xl"
        style={{
          background: "rgba(10,10,10,0.9)",
          borderColor: color + "30",
          boxShadow: `0 0 40px ${color}15, 0 8px 32px rgba(0,0,0,0.6)`,
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center"
              style={{ backgroundColor: color + "20" }}
            >
              <Icon className="w-4 h-4" style={{ color }} />
            </div>
            <div className="min-w-0">
              <p
                className="text-[9px] uppercase tracking-[0.15em] font-bold"
                style={{ color }}
              >
                {TYPE_LABELS[node.type] || node.type}
              </p>
              <div className="flex items-center gap-2">
                <h3 className="text-[13px] font-bold text-white leading-tight truncate">
                  {node.label}
                </h3>
                {node.type === "song" && (
                  <PlayButton
                    spotifyTrackId={(meta.spotify_track_id as string) || null}
                    songId={node.id.replace(/^song-/, "")}
                    size="sm"
                  />
                )}
              </div>
            </div>
          </div>
          <button
            onClick={() => selectNode(null)}
            className="p-1 rounded-md text-white/25 hover:text-white/60 hover:bg-white/[0.06] transition-colors flex-shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Quick stats */}
        <QuickStats type={node.type} meta={meta} color={color} />

        {/* Trivia */}
        {summary && (
          <p className="text-[11px] text-white/50 leading-relaxed">{summary}</p>
        )}

        {/* Topic badges */}
        {node.type === "song" &&
          (meta.primary_topics as string[])?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {(meta.primary_topics as string[]).slice(0, 4).map((t) => (
                <span
                  key={t}
                  className="px-2 py-0.5 rounded-full text-[9px] font-semibold border"
                  style={{
                    backgroundColor: color + "0d",
                    borderColor: color + "20",
                    color: color + "cc",
                  }}
                >
                  {t}
                </span>
              ))}
            </div>
          )}
      </div>
    </div>
  );
}

function QuickStats({
  type,
  meta,
  color,
}: {
  type: string;
  meta: Record<string, unknown>;
  color: string;
}) {
  if (type === "song") {
    const energy = meta.energy as number | undefined;
    const bpm = meta.tempo_bpm as number | undefined;
    const key = meta.key as string | undefined;

    return (
      <div className="flex items-center gap-3 text-[10px] text-white/40">
        {energy != null && (
          <div className="flex items-center gap-1">
            <Zap className="w-3 h-3" style={{ color }} />
            <div className="w-14 h-1 rounded-full bg-white/[0.08] overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{ width: `${energy * 100}%`, backgroundColor: color }}
              />
            </div>
          </div>
        )}
        {bpm != null && (
          <span className="flex items-center gap-1">
            <Gauge className="w-3 h-3" /> {Math.round(bpm)}
          </span>
        )}
        {key != null && <span className="font-mono">{key}</span>}
      </div>
    );
  }

  if (type === "album") {
    return (
      <div className="flex items-center gap-3 text-[10px] text-white/40">
        {!!meta.release_year && <span>{String(meta.release_year)}</span>}
        {meta.song_count !== undefined && meta.song_count !== null && (
          <span>{String(meta.song_count)} tracks</span>
        )}
      </div>
    );
  }

  if (type === "mc") {
    return (
      <div className="flex items-center gap-3 text-[10px] text-white/40">
        {meta.song_count !== undefined && meta.song_count !== null && (
          <span>{String(meta.song_count)} tracks</span>
        )}
        <span>Seedhe Maut</span>
      </div>
    );
  }

  if (type === "entity_artist" || type === "place" || type === "cultural_ref") {
    return (
      <div className="flex items-center gap-3 text-[10px] text-white/40">
        {meta.mention_count !== undefined && meta.mention_count !== null && (
          <span>{String(meta.mention_count)} mentions</span>
        )}
        {!!meta.entity_type && <span>{String(meta.entity_type)}</span>}
      </div>
    );
  }

  if (type === "topic") {
    return (
      <div className="flex items-center gap-3 text-[10px] text-white/40">
        {meta.song_count !== undefined && meta.song_count !== null && (
          <span>{String(meta.song_count)} songs</span>
        )}
      </div>
    );
  }

  return null;
}
