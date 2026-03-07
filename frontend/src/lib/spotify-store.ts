import { create } from "zustand";
import { persist } from "zustand/middleware";
import { toast } from "sonner";
import {
  getSpotifyAuthUrl,
  refreshSpotifyToken,
  matchAllSongsToSpotify,
} from "./api";

interface SpotifyState {
  // Auth
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number; // ms timestamp
  isAuthenticated: boolean;

  // Player
  currentTrackId: string | null;
  isPlaying: boolean;
  deviceId: string | null;
  player: Spotify.Player | null;
  sdkReady: boolean;

  // Track info (event-driven from SDK)
  currentTrackInfo: { name: string; artist: string; albumArt: string } | null;
  currentSongDbId: string | null; // DB song ID for the currently playing track

  // Playback position (for lyric sync)
  playbackPosition: number; // ms
  playbackDuration: number; // ms
  _positionTimestamp: number; // Date.now() when position was last updated

  // Matching
  isMatching: boolean;
  matchCount: number;

  // Actions
  login: () => Promise<void>;
  setTokens: (access: string, refresh: string, expiresIn: number) => void;
  logout: () => void;
  getValidToken: () => Promise<string | null>;
  setPlayer: (player: Spotify.Player | null) => void;
  setDeviceId: (id: string | null) => void;
  setSdkReady: (ready: boolean) => void;
  play: (spotifyUri: string, songDbId?: string) => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  setCurrentTrack: (id: string | null) => void;
  setIsPlaying: (playing: boolean) => void;
  setCurrentTrackInfo: (info: { name: string; artist: string; albumArt: string } | null) => void;
  setPlaybackPosition: (position: number, duration: number) => void;
  getInterpolatedPosition: () => number;
  matchSongs: () => Promise<void>;
}

export const useSpotifyStore = create<SpotifyState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      expiresAt: 0,
      isAuthenticated: false,

      currentTrackId: null,
      isPlaying: false,
      deviceId: null,
      player: null,
      sdkReady: false,
      currentTrackInfo: null,
      currentSongDbId: null,

      playbackPosition: 0,
      playbackDuration: 0,
      _positionTimestamp: 0,

      isMatching: false,
      matchCount: 0,

      login: async () => {
        // Remember current page to redirect back after OAuth
        sessionStorage.setItem("spotify_return_to", window.location.pathname);
        const { url } = await getSpotifyAuthUrl();
        window.location.href = url;
      },

      setTokens: (access, refresh, expiresIn) => {
        set({
          accessToken: access,
          refreshToken: refresh,
          expiresAt: Date.now() + expiresIn * 1000,
          isAuthenticated: true,
        });
      },

      logout: () => {
        const player = get().player;
        if (player) player.disconnect();
        set({
          accessToken: null,
          refreshToken: null,
          expiresAt: 0,
          isAuthenticated: false,
          currentTrackId: null,
          isPlaying: false,
          deviceId: null,
          player: null,
          sdkReady: false,
          currentTrackInfo: null,
        });
      },

      getValidToken: async () => {
        const { accessToken, refreshToken, expiresAt } = get();
        if (!accessToken || !refreshToken) return null;

        // Refresh if expiring within 60s
        if (Date.now() > expiresAt - 60_000) {
          try {
            const data = await refreshSpotifyToken(refreshToken);
            set({
              accessToken: data.access_token,
              refreshToken: data.refresh_token,
              expiresAt: Date.now() + data.expires_in * 1000,
            });
            return data.access_token;
          } catch {
            toast.error("Spotify session expired — please reconnect");
            set({ isAuthenticated: false, accessToken: null });
            return null;
          }
        }
        return accessToken;
      },

      setPlayer: (player) => set({ player }),
      setDeviceId: (id) => set({ deviceId: id }),
      setSdkReady: (ready) => set({ sdkReady: ready }),
      setCurrentTrack: (id) => set({ currentTrackId: id }),
      setIsPlaying: (playing) => set({ isPlaying: playing }),
      setCurrentTrackInfo: (info) => set({ currentTrackInfo: info }),
      setPlaybackPosition: (position, duration) =>
        set({ playbackPosition: position, playbackDuration: duration, _positionTimestamp: Date.now() }),
      getInterpolatedPosition: () => {
        const { playbackPosition, _positionTimestamp, isPlaying } = get();
        if (!isPlaying) return playbackPosition;
        return playbackPosition + (Date.now() - _positionTimestamp);
      },

      play: async (spotifyUri: string, songDbId?: string) => {
        const token = await get().getValidToken();
        const { deviceId } = get();
        if (!token || !deviceId) return;

        const playReq = async () =>
          fetch(
            `https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`,
            {
              method: "PUT",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ uris: [spotifyUri] }),
            }
          );

        let resp = await playReq();

        // 404 = device not active yet — transfer playback first, then retry
        if (resp.status === 404) {
          console.log("[Spotify] Transferring playback to device...");
          await fetch("https://api.spotify.com/v1/me/player", {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ device_ids: [deviceId], play: false }),
          });
          // Brief wait for Spotify to register the transfer
          await new Promise((r) => setTimeout(r, 500));
          resp = await playReq();
        }

        if (!resp.ok) {
          console.error("[Spotify] Play failed:", resp.status);
          return;
        }
        set({ isPlaying: true, currentTrackId: spotifyUri, currentSongDbId: songDbId ?? null });
      },

      pause: async () => {
        const token = await get().getValidToken();
        if (!token) return;
        await fetch("https://api.spotify.com/v1/me/player/pause", {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}` },
        });
        set({ isPlaying: false });
      },

      resume: async () => {
        const token = await get().getValidToken();
        if (!token) return;
        await fetch("https://api.spotify.com/v1/me/player/play", {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}` },
        });
        set({ isPlaying: true });
      },

      matchSongs: async () => {
        const token = await get().getValidToken();
        if (!token) return;
        set({ isMatching: true });
        try {
          const results = await matchAllSongsToSpotify(token);
          const matched = results.filter((r) => r.matched).length;
          set({ matchCount: matched });
          toast.success(`Matched ${matched} songs to Spotify`);
        } finally {
          set({ isMatching: false });
        }
      },
    }),
    {
      name: "raag-spotify",
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        expiresAt: state.expiresAt,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
