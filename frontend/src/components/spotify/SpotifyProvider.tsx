"use client";

import { SpotifySDK } from "./SpotifySDK";
import { SpotifyMiniPlayer } from "./SpotifyMiniPlayer";

export function SpotifyProvider() {
  return (
    <>
      <SpotifySDK />
      <SpotifyMiniPlayer />
    </>
  );
}
