"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { useUniverseStore } from "@/lib/universe-store";
import { UniverseHeader } from "@/components/universe/UniverseHeader";
import { UniverseControls } from "@/components/universe/UniverseControls";
import { NodeDetailPanel } from "@/components/universe/NodeDetailPanel";
import { TimelineView } from "@/components/universe/TimelineView";
import { GraphLoadingSkeleton } from "@/components/universe/GraphLoadingSkeleton";
import { SpotifySDK } from "@/components/spotify/SpotifySDK";
import { SpotifyMiniPlayer } from "@/components/spotify/SpotifyMiniPlayer";

const ForceGraph = dynamic(
  () => import("@/components/universe/ForceGraph").then((m) => m.ForceGraph),
  { ssr: false },
);

export default function UniversePage() {
  const { fetchGraph, isLoading, nodes, viewMode } = useUniverseStore();

  useEffect(() => {
    fetchGraph();
  }, [fetchGraph]);

  return (
    <main className="h-screen w-screen bg-[#050505] overflow-hidden relative">
      <UniverseHeader />

      {isLoading && nodes.length === 0 && <GraphLoadingSkeleton />}

      {viewMode === "timeline" ? (
        <TimelineView />
      ) : (
        <div className="w-full h-full">
          <ForceGraph />
        </div>
      )}

      <UniverseControls />
      <NodeDetailPanel />
      <SpotifySDK />
      <SpotifyMiniPlayer />
    </main>
  );
}
