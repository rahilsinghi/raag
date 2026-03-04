"use client";

import { Play, Pause, ExternalLink } from "lucide-react";
import { useSpotifyStore } from "@/lib/spotify-store";

interface PlayButtonProps {
  spotifyTrackId: string | null;
  size?: "sm" | "md";
  className?: string;
}

export function PlayButton({
  spotifyTrackId,
  size = "sm",
  className = "",
}: PlayButtonProps) {
  const { isAuthenticated, isPlaying, currentTrackId, deviceId, play, pause } =
    useSpotifyStore();

  if (!spotifyTrackId) return null;

  const uri = `spotify:track:${spotifyTrackId}`;
  const isThisPlaying = isPlaying && currentTrackId === uri;
  const iconSize = size === "sm" ? "w-3 h-3" : "w-4 h-4";
  const btnSize = size === "sm" ? "w-6 h-6" : "w-8 h-8";
  const spotifyUrl = `https://open.spotify.com/track/${spotifyTrackId}`;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (!isAuthenticated || !deviceId) {
      // Fallback: open in Spotify
      window.open(spotifyUrl, "_blank");
      return;
    }

    if (isThisPlaying) {
      pause();
    } else {
      play(uri);
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`inline-flex items-center justify-center ${btnSize} rounded-full
        ${
          isThisPlaying
            ? "bg-[#1DB954] text-black"
            : "bg-[#1DB954]/15 text-[#1DB954] hover:bg-[#1DB954]/25"
        } transition-colors ${className}`}
      title={
        !isAuthenticated
          ? "Open in Spotify"
          : !deviceId
            ? "Connecting player..."
            : isThisPlaying
              ? "Pause"
              : "Play"
      }
    >
      {isThisPlaying ? (
        <Pause className={iconSize} />
      ) : !isAuthenticated ? (
        <ExternalLink className={iconSize} />
      ) : (
        <Play className={`${iconSize} ml-0.5`} />
      )}
    </button>
  );
}
