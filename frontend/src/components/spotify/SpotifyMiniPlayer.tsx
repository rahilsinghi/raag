"use client";

import { useEffect, useState } from "react";
import { Pause, Play, SkipBack, SkipForward, Volume2 } from "lucide-react";
import { useSpotifyStore } from "@/lib/spotify-store";

interface TrackInfo {
  name: string;
  artists: string;
  albumArt: string;
}

export function SpotifyMiniPlayer() {
  const { isAuthenticated, isPlaying, player, currentTrackId, pause, resume } =
    useSpotifyStore();
  const [track, setTrack] = useState<TrackInfo | null>(null);

  useEffect(() => {
    if (!player || !currentTrackId) return;

    const interval = setInterval(async () => {
      const state = await player.getCurrentState();
      if (state?.track_window.current_track) {
        const t = state.track_window.current_track;
        setTrack({
          name: t.name,
          artists: t.artists.map((a) => a.name).join(", "),
          albumArt: t.album.images[0]?.url || "",
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [player, currentTrackId]);

  if (!isAuthenticated || !currentTrackId || !track) return null;

  return (
    <div
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3
        px-4 py-2.5 rounded-2xl border border-white/[0.08]
        backdrop-blur-xl shadow-2xl"
      style={{
        background: "rgba(10,10,10,0.92)",
        boxShadow: "0 0 40px rgba(29,185,84,0.08), 0 8px 32px rgba(0,0,0,0.6)",
      }}
    >
      {/* Album art */}
      {track.albumArt && (
        <img
          src={track.albumArt}
          alt={track.name}
          className="w-10 h-10 rounded-lg object-cover"
        />
      )}

      {/* Track info */}
      <div className="min-w-0 max-w-[180px]">
        <p className="text-[12px] font-semibold text-white truncate">
          {track.name}
        </p>
        <p className="text-[10px] text-white/40 truncate">{track.artists}</p>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-1 ml-2">
        <button
          onClick={() => player?.previousTrack()}
          className="p-1.5 rounded-full text-white/40 hover:text-white/70 transition-colors"
        >
          <SkipBack className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => (isPlaying ? pause() : resume())}
          className="p-2 rounded-full bg-[#1DB954] text-black hover:bg-[#1ed760] transition-colors"
        >
          {isPlaying ? (
            <Pause className="w-4 h-4" />
          ) : (
            <Play className="w-4 h-4 ml-0.5" />
          )}
        </button>
        <button
          onClick={() => player?.nextTrack()}
          className="p-1.5 rounded-full text-white/40 hover:text-white/70 transition-colors"
        >
          <SkipForward className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Volume */}
      <button className="p-1.5 rounded-full text-white/30 hover:text-white/50 transition-colors ml-1">
        <Volume2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
