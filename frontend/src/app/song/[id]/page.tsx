"use client";

import { use } from "react";
import { SongDeepDive } from "@/components/song/deep-dive/SongDeepDive";
import { SpotifySDK } from "@/components/spotify/SpotifySDK";
import { SpotifyMiniPlayer } from "@/components/spotify/SpotifyMiniPlayer";

export default function SongPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  return (
    <main className="h-screen w-screen bg-[#050505] overflow-hidden flex flex-col">
      <SongDeepDive songId={id} />
      <SpotifySDK />
      <SpotifyMiniPlayer />
    </main>
  );
}
