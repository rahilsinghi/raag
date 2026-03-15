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

    // If SDK is already loaded (e.g., hot reload), just mark ready
    if (window.Spotify) {
      console.log("[Spotify SDK] Already loaded, marking ready");
      setSdkReady(true);
      return;
    }

    console.log("[Spotify SDK] Loading script...");

    window.onSpotifyWebPlaybackSDKReady = () => {
      console.log("[Spotify SDK] Ready callback fired");
      setSdkReady(true);
    };

    if (!document.getElementById("spotify-sdk")) {
      const script = document.createElement("script");
      script.id = "spotify-sdk";
      script.src = "https://sdk.scdn.co/spotify-player.js";
      script.async = true;
      document.body.appendChild(script);
    }
  }, [isAuthenticated, sdkReady, setSdkReady]);

  // Initialize player when SDK ready
  // NOTE: accessToken is intentionally NOT a dependency here.
  // getOAuthToken callback calls getValidToken() dynamically, so including
  // accessToken would tear down & recreate the player on every token refresh.
  useEffect(() => {
    if (!sdkReady || !isAuthenticated) return;

    // Ensure we have a token before creating the player
    getValidToken().then((token) => {
      if (!token) {
        console.warn("[Spotify SDK] No valid token, skipping player init");
        return;
      }

      console.log("[Spotify SDK] Initializing player...");

      const player = new window.Spotify.Player({
        name: "Raag Player",
        getOAuthToken: async (cb: (token: string) => void) => {
          const t = await getValidToken();
          if (t) cb(t);
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
    });

    return () => {
      const currentPlayer = useSpotifyStore.getState().player;
      if (currentPlayer) {
        currentPlayer.disconnect();
        setPlayer(null);
        setDeviceId(null);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sdkReady, isAuthenticated]);

  return null;
}
