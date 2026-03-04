"use client";

import { useMemo } from "react";
import { useUniverseStore } from "@/lib/universe-store";
import { MC_NODE_COLORS } from "@/lib/graph-constants";
import type { GraphNodeData } from "@/lib/types";

const YEARS = [2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025];

export function TimelineView() {
  const { nodes, edges, selectNode } = useUniverseStore();

  const albums = useMemo(
    () =>
      nodes
        .filter((n) => n.type === "album")
        .sort(
          (a, b) =>
            ((a.metadata.release_year as number) || 0) -
            ((b.metadata.release_year as number) || 0),
        ),
    [nodes],
  );

  const songsByAlbum = useMemo(() => {
    const map: Record<string, GraphNodeData[]> = {};
    const containsEdges = edges.filter((e) => e.type === "contains");
    for (const edge of containsEdges) {
      const albumId = edge.source;
      const songNode = nodes.find((n) => n.id === edge.target);
      if (songNode) {
        (map[albumId] ??= []).push(songNode);
      }
    }
    return map;
  }, [nodes, edges]);

  // Determine which MC performs each song
  const songMcMap = useMemo(() => {
    const map: Record<string, string[]> = {};
    const mcEdges = edges.filter((e) => e.type === "mc_performs");
    for (const edge of mcEdges) {
      const mcNode = nodes.find((n) => n.id === edge.source);
      const songId = edge.target;
      if (mcNode) {
        (map[songId] ??= []).push(mcNode.label.toLowerCase());
      }
    }
    return map;
  }, [nodes, edges]);

  return (
    <div className="fixed inset-0 bg-[#050505] z-10 pt-16 overflow-x-auto overflow-y-hidden">
      <div className="relative h-full min-w-[1200px] px-12 flex flex-col justify-center">
        {/* Center timeline line */}
        <div className="absolute left-8 right-8 top-1/2 h-px bg-white/10" />

        {/* Year markers */}
        <div className="absolute left-8 right-8 top-1/2 flex justify-between items-center pointer-events-none -translate-y-1/2">
          {YEARS.map((year) => (
            <div key={year} className="flex flex-col items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-[#d91d1c]/60" />
              <span className="font-maut text-[11px] text-white/30 font-bold tracking-wider mt-1">
                {year}
              </span>
            </div>
          ))}
        </div>

        {/* Albums above the line */}
        <div className="absolute left-8 right-8 flex justify-around" style={{ top: "calc(50% - 80px)" }}>
          {albums.map((album, i) => {
            const year = album.metadata.release_year as number;
            return (
              <button
                key={album.id}
                onClick={() => selectNode(album)}
                className="group flex flex-col items-center gap-2 transition-transform duration-300 hover:scale-110"
                style={{
                  animationDelay: `${i * 0.1}s`,
                }}
              >
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg bg-[#d91d1c]/10 border border-[#d91d1c]/20 flex items-center justify-center group-hover:border-[#d91d1c]/50 group-hover:shadow-[0_0_20px_rgba(217,29,28,0.2)] transition-all duration-300 overflow-hidden">
                  {album.metadata.cover_art_url ? (
                    <img
                      src={album.metadata.cover_art_url as string}
                      alt={album.label}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="font-maut text-[10px] text-[#d91d1c]/60 text-center px-1 leading-tight">
                      {album.label}
                    </span>
                  )}
                </div>
                <div className="text-center">
                  <p className="text-[11px] font-semibold text-white/70 group-hover:text-white transition-colors leading-tight max-w-[96px] truncate">
                    {album.label}
                  </p>
                  {year && (
                    <p className="text-[9px] text-white/30">{year}</p>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Song dots below the line */}
        <div className="absolute left-8 right-8 flex justify-around" style={{ top: "calc(50% + 40px)" }}>
          {albums.map((album) => {
            const songs = songsByAlbum[album.id] || [];
            return (
              <div key={album.id} className="flex flex-wrap gap-1.5 justify-center max-w-[120px]">
                {songs.map((song) => {
                  const mcs = songMcMap[song.id] || [];
                  // Color: green if Encore, amber if Calm, white if both/neither
                  let dotColor = "#ffffff66";
                  if (mcs.includes("encore") && !mcs.includes("calm")) {
                    dotColor = MC_NODE_COLORS.encore;
                  } else if (mcs.includes("calm") && !mcs.includes("encore")) {
                    dotColor = MC_NODE_COLORS.calm;
                  }
                  return (
                    <button
                      key={song.id}
                      onClick={() => selectNode(song)}
                      className="w-2.5 h-2.5 rounded-full transition-transform duration-200 hover:scale-[2] hover:ring-1 hover:ring-white/30"
                      style={{ backgroundColor: dotColor }}
                      title={song.label}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
