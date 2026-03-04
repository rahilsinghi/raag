import { create } from "zustand";
import { persist } from "zustand/middleware";
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
  play: (spotifyUri: string) => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  setCurrentTrack: (id: string | null) => void;
  setIsPlaying: (playing: boolean) => void;
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

      play: async (spotifyUri: string) => {
        const token = await get().getValidToken();
        const { deviceId } = get();
        if (!token || !deviceId) return;

        await fetch(
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
        set({ isPlaying: true, currentTrackId: spotifyUri });
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
