"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useSpotifyStore } from "@/lib/spotify-store";

export function SpotifyCallback() {
  const setTokens = useSpotifyStore((s) => s.setTokens);
  const matchSongs = useSpotifyStore((s) => s.matchSongs);
  const router = useRouter();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;

    // Check for tokens in URL fragment (set by server-side callback)
    const hash = window.location.hash.slice(1);
    if (!hash) return;

    const params = new URLSearchParams(hash);
    const accessToken = params.get("spotify_access");
    const refreshToken = params.get("spotify_refresh");
    const expiresIn = params.get("spotify_expires");

    if (!accessToken || !refreshToken || !expiresIn) return;

    handled.current = true;

    // Clean URL
    window.history.replaceState({}, "", window.location.pathname);

    // Store tokens
    setTokens(accessToken, refreshToken, parseInt(expiresIn, 10));
    toast.success("Spotify connected");

    // Auto-match songs in background
    matchSongs();

    // Redirect back to the page user was on before OAuth
    const returnTo = sessionStorage.getItem("spotify_return_to");
    sessionStorage.removeItem("spotify_return_to");
    if (returnTo && returnTo !== "/") {
      router.push(returnTo);
    }
  }, [setTokens, matchSongs, router]);

  return null;
}
