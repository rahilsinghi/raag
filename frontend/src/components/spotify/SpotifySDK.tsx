"use client";

import { useEffect } from "react";
import { useSpotifyStore } from "@/lib/spotify-store";

declare global {
  interface Window {
    onSpotifyWebPlaybackSDKReady: () => void;
    Spotify: typeof Spotify;
  }
}

export function SpotifySDK() {
  const {
    isAuthenticated,
    accessToken,
    sdkReady,
    setSdkReady,
    setPlayer,
    setDeviceId,
    setIsPlaying,
    setCurrentTrack,
    setCurrentTrackInfo,
    setPlaybackPosition,
    getValidToken,
  } = useSpotifyStore();

  // Load SDK script
  useEffect(() => {
    if (!isAuthenticated || sdkReady) return;
    if (document.getElementById("spotify-sdk")) return;

    console.log("[Spotify SDK] Loading script...");

    window.onSpotifyWebPlaybackSDKReady = () => {
      console.log("[Spotify SDK] Ready callback fired");
      setSdkReady(true);
    };

    const script = document.createElement("script");
    script.id = "spotify-sdk";
    script.src = "https://sdk.scdn.co/spotify-player.js";
    script.async = true;
    document.body.appendChild(script);
  }, [isAuthenticated, sdkReady, setSdkReady]);

  // Initialize player when SDK ready
  useEffect(() => {
    if (!sdkReady || !isAuthenticated || !accessToken) return;

    console.log("[Spotify SDK] Initializing player...");

    const player = new window.Spotify.Player({
      name: "Raag Player",
      getOAuthToken: async (cb: (token: string) => void) => {
        const token = await getValidToken();
        if (token) cb(token);
      },
      volume: 0.5,
    });

    player.addListener("ready", ({ device_id }: { device_id: string }) => {
      console.log("[Spotify SDK] Player ready, device_id:", device_id);
      setDeviceId(device_id);
    });

    player.addListener("not_ready", () => {
      console.warn("[Spotify SDK] Player not ready");
      setDeviceId(null);
    });

    player.addListener("initialization_error", ({ message }: { message: string }) => {
      console.error("[Spotify SDK] Init error:", message);
    });

    player.addListener("authentication_error", ({ message }: { message: string }) => {
      console.error("[Spotify SDK] Auth error:", message);
    });

    player.addListener("account_error", ({ message }: { message: string }) => {
      console.error("[Spotify SDK] Account error:", message);
    });

    player.addListener(
      "player_state_changed",
      (state: Spotify.PlaybackState | null) => {
        if (!state) {
          setIsPlaying(false);
          setCurrentTrackInfo(null);
          return;
        }
        setIsPlaying(!state.paused);
        setPlaybackPosition(state.position, state.duration);
        const track = state.track_window.current_track;
        if (track) {
          setCurrentTrack(`spotify:track:${track.id}`);
          setCurrentTrackInfo({
            name: track.name,
            artist: track.artists.map((a) => a.name).join(", "),
            albumArt: track.album.images[0]?.url || "",
          });
        }
      }
    );

    player.connect().then((success: boolean) => {
      console.log("[Spotify SDK] Connect result:", success);
    });
    setPlayer(player);

    return () => {
      player.disconnect();
      setPlayer(null);
      setDeviceId(null);
    };
  }, [
    sdkReady,
    isAuthenticated,
    accessToken,
    setPlayer,
    setDeviceId,
    setIsPlaying,
    setCurrentTrack,
    setCurrentTrackInfo,
    setPlaybackPosition,
    getValidToken,
  ]);

  return null;
}
