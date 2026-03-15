"use client";

import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { useUniverseStore } from "@/lib/universe-store";
import { getAlbumArt } from "@/lib/album-art";
import { Music, Disc3, Users, Hash, Zap } from "lucide-react";
import type { GraphNodeData } from "@/lib/types";

const ease = [0.16, 1, 0.3, 1] as [number, number, number, number];

function getNodeIcon(type: string) {
  switch (type) {
    case "song": return Music;
    case "album": return Disc3;
    case "mc":
    case "feature_artist": return Users;
    case "topic": return Hash;
    default: return Zap;
  }
}

function getNodeColor(type: string, label: string): string {
  if (type === "mc") {
    return label.toLowerCase() === "encore" ? "#34d399" : "#fbbf24";
  }
  const colors: Record<string, string> = {
    album: "#d91d1c",
    song: "#ffffff",
    feature_artist: "#60a5fa",
    topic: "#a78bfa",
    place: "#22d3ee",
    cultural_ref: "#fbbf24",
  };
  return colors[type] || "#ffffff";
}

function NodeContent({ node }: { node: GraphNodeData }) {
  const Icon = getNodeIcon(node.type);
  const color = getNodeColor(node.type, node.label);
  const meta = node.metadata;

  const albumArt = node.type === "album"
    ? getAlbumArt((meta.slug as string) || "")
    : node.type === "song"
      ? getAlbumArt((meta.album_title as string) || "")
      : null;

  return (
    <div className="flex items-center gap-3">
      {/* Thumbnail */}
      {albumArt ? (
        <div className="relative w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-white/[0.03]">
          <Image src={albumArt} alt={node.label} fill className="object-cover" />
        </div>
      ) : (
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${color}15` }}
        >
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
      )}

      {/* Info */}
      <div className="min-w-0">
        <p className="text-[13px] font-semibold text-white truncate max-w-[180px]">
          {node.label}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span
            className="text-[10px] font-semibold uppercase tracking-wider"
            style={{ color: `${color}99` }}
          >
            {node.type.replace(/_/g, " ")}
          </span>

          {node.type === "song" && meta.tempo_bpm != null && (
            <span className="text-[10px] text-white/25">
              {String(Math.round(meta.tempo_bpm as number))} BPM
            </span>
          )}
          {node.type === "song" && meta.energy != null && (
            <span className="text-[10px] text-white/25">
              {String(Math.round((meta.energy as number) * 100))}% energy
            </span>
          )}
          {node.type === "album" && meta.release_year != null && (
            <span className="text-[10px] text-white/25">
              {String(meta.release_year)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export function NodeHoverCard() {
  const hoveredNode = useUniverseStore((s) => s.hoveredNode);
  const panelOpen = useUniverseStore((s) => s.panelOpen);

  // Don't show hover card when panel is open (it would be distracting)
  const visible = hoveredNode && !panelOpen;

  return (
    <AnimatePresence>
      {visible && hoveredNode && (
        <motion.div
          key={hoveredNode.id}
          initial={{ opacity: 0, y: 4, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 4, scale: 0.96 }}
          transition={{ duration: 0.2, ease }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 pointer-events-none"
        >
          <div
            className="px-4 py-3 rounded-xl border border-white/[0.08]"
            style={{
              background: "rgba(8, 8, 8, 0.92)",
              backdropFilter: "blur(30px)",
              WebkitBackdropFilter: "blur(30px)",
              boxShadow: "0 20px 60px rgba(0, 0, 0, 0.6), 0 0 20px rgba(0, 0, 0, 0.3)",
            }}
          >
            <NodeContent node={hoveredNode} />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
