"use client";

import { useSpotifyStore } from "@/lib/spotify-store";

export function SpotifyLoginButton() {
  const { isAuthenticated, login, logout, deviceId, sdkReady } = useSpotifyStore();

  if (isAuthenticated) {
    const status = deviceId ? "Ready" : sdkReady ? "Connecting..." : "Loading SDK...";
    return (
      <button
        onClick={logout}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
          deviceId
            ? "bg-[#1DB954]/15 text-[#1DB954] border-[#1DB954]/20 hover:bg-[#1DB954]/25"
            : "bg-amber-500/15 text-amber-400 border-amber-500/20"
        }`}
      >
        <SpotifyIcon className="w-3.5 h-3.5" />
        {status}
      </button>
    );
  }

  return (
    <button
      onClick={login}
      className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold
        bg-white/[0.06] text-white/50 border border-white/[0.08]
        hover:bg-[#1DB954]/15 hover:text-[#1DB954] hover:border-[#1DB954]/20 transition-colors"
    >
      <SpotifyIcon className="w-3.5 h-3.5" />
      Connect Spotify
    </button>
  );
}

function SpotifyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
    </svg>
  );
}
