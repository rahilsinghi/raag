"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { useUniverseStore } from "@/lib/universe-store";
import { AppHeader } from "@/components/layout/AppHeader";
import { UniverseControls } from "@/components/universe/UniverseControls";
import { GraphSidePanel } from "@/components/universe/GraphSidePanel";
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
    <main className="h-screen w-screen bg-[#050505] overflow-hidden relative flex flex-col">
      <AppHeader />

      <div className="flex-1 relative overflow-hidden">
        {isLoading && nodes.length === 0 && <GraphLoadingSkeleton />}

        {viewMode === "timeline" ? (
          <TimelineView />
        ) : (
          <div className="w-full h-full">
            <ForceGraph />
          </div>
        )}

        <UniverseControls />
        <GraphSidePanel />
      </div>

      <SpotifySDK />
      <SpotifyMiniPlayer />
    </main>
  );
}
