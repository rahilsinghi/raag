"use client";

import { useState } from "react";
import { Pause, Play, SkipBack, SkipForward, Volume2, VolumeX, AlignLeft } from "lucide-react";
import { useSpotifyStore } from "@/lib/spotify-store";
import { RhymeSheetPanel } from "@/components/rhyme/RhymeSheetPanel";

export function SpotifyMiniPlayer() {
  const {
    isAuthenticated,
    isPlaying,
    player,
    currentTrackId,
    currentTrackInfo,
    currentSongDbId,
    pause,
    resume,
  } = useSpotifyStore();
  const [muted, setMuted] = useState(false);
  const [showRhymeSheet, setShowRhymeSheet] = useState(false);

  if (!isAuthenticated || !currentTrackId) return null;

  const toggleMute = () => {
    if (!player) return;
    if (muted) {
      player.setVolume(0.5);
      setMuted(false);
    } else {
      player.setVolume(0);
      setMuted(true);
    }
  };

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
      {currentTrackInfo?.albumArt && (
        <img
          src={currentTrackInfo.albumArt}
          alt={currentTrackInfo.name}
          className="w-10 h-10 rounded-lg object-cover"
        />
      )}

      {/* Track info */}
      <div className="min-w-0 max-w-[180px]">
        {currentTrackInfo ? (
          <>
            <p className="text-[12px] font-semibold text-white truncate">
              {currentTrackInfo.name}
            </p>
            <p className="text-[10px] text-white/40 truncate">
              {currentTrackInfo.artist}
            </p>
          </>
        ) : (
          <p className="text-[11px] text-white/30">No track playing</p>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-1 ml-2">
        <button
          onClick={() => player?.previousTrack()}
          className="p-1.5 rounded-full text-white/40 hover:text-white/70 transition-colors"
          aria-label="Previous track"
        >
          <SkipBack className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => (isPlaying ? pause() : resume())}
          className="p-2 rounded-full bg-[#1DB954] text-black hover:bg-[#1ed760] transition-colors"
          aria-label={isPlaying ? "Pause" : "Play"}
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
          aria-label="Next track"
        >
          <SkipForward className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Lyrics toggle */}
      {currentSongDbId && (
        <button
          onClick={() => setShowRhymeSheet((v) => !v)}
          className={`p-1.5 rounded-full transition-colors ml-1 ${
            showRhymeSheet
              ? "text-[#d91d1c] bg-[#d91d1c]/10"
              : "text-white/30 hover:text-white/50"
          }`}
          aria-label={showRhymeSheet ? "Hide lyrics" : "Show lyrics"}
        >
          <AlignLeft className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Volume toggle */}
      <button
        onClick={toggleMute}
        className="p-1.5 rounded-full text-white/30 hover:text-white/50 transition-colors ml-1"
        aria-label={muted ? "Unmute" : "Mute"}
      >
        {muted ? (
          <VolumeX className="w-3.5 h-3.5" />
        ) : (
          <Volume2 className="w-3.5 h-3.5" />
        )}
      </button>

      {/* Rhyme Sheet Panel */}
      {showRhymeSheet && currentSongDbId && (
        <RhymeSheetPanel
          songId={currentSongDbId}
          onClose={() => setShowRhymeSheet(false)}
        />
      )}
    </div>
  );
}
