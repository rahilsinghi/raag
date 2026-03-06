"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Pause, Play, SkipBack, SkipForward, Volume2, VolumeX, AlignLeft } from "lucide-react";
import { useSpotifyStore } from "@/lib/spotify-store";
import { RhymeSheetPanel } from "@/components/rhyme/RhymeSheetPanel";

/** Compute the "home" position: right of the chat input bar, vertically aligned with it. */
function getHomePos() {
  if (typeof window === "undefined") return { x: 0, y: 0 };
  // Chat input is max-w-3xl (768px) centered, with px-4 (16px) on each side
  const chatRight = Math.min(window.innerWidth, (window.innerWidth + 768) / 2 + 16);
  // Sit right next to it, with 8px gap, vertically near bottom (input area ~60px from bottom)
  return {
    x: Math.min(chatRight + 8, window.innerWidth - 64),
    y: window.innerHeight - 100,
  };
}

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
  const [expanded, setExpanded] = useState(false);

  // Dragging state
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [positioned, setPositioned] = useState(false);
  const dragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const dragMoved = useRef(false);

  // Set initial position to home (right of chat input)
  useEffect(() => {
    if (!positioned) {
      setPos(getHomePos());
      setPositioned(true);
    }
  }, [positioned]);

  // Recalculate home on resize
  useEffect(() => {
    const onResize = () => {
      if (!expanded && !dragging.current) {
        setPos(getHomePos());
      }
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [expanded]);

  const snapHome = useCallback(() => {
    setPos(getHomePos());
  }, []);

  // Drag handlers — only on the bubble button, not the expanded panel
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (expanded) return; // don't drag when expanded
    dragging.current = true;
    dragMoved.current = false;
    dragStart.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [pos, expanded]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    dragMoved.current = true;
    const newX = Math.max(0, Math.min(window.innerWidth - 56, e.clientX - dragStart.current.x));
    const newY = Math.max(0, Math.min(window.innerHeight - 56, e.clientY - dragStart.current.y));
    setPos({ x: newX, y: newY });
  }, []);

  const onPointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  const handleBubbleClick = useCallback(() => {
    if (!dragMoved.current) {
      setExpanded(true);
    }
  }, []);

  const handleClose = useCallback(() => {
    setExpanded(false);
    snapHome();
  }, [snapHome]);

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
    <>
      {/* Draggable bubble wrapper */}
      <div
        className="fixed z-50 select-none touch-none"
        style={{
          left: pos.x,
          top: pos.y,
          transition: dragging.current ? "none" : "left 0.3s ease, top 0.3s ease",
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        {/* Collapsed: circular bubble */}
        <button
          onClick={handleBubbleClick}
          className={`w-14 h-14 rounded-full flex items-center justify-center
            border border-white/[0.08] backdrop-blur-xl shadow-2xl
            transition-all duration-300 cursor-grab active:cursor-grabbing ${
              expanded ? "scale-0 opacity-0 pointer-events-none" : "scale-100 opacity-100"
            }`}
          style={{
            background: "rgba(10,10,10,0.92)",
            boxShadow: isPlaying
              ? "0 0 20px rgba(29,185,84,0.25), 0 4px 16px rgba(0,0,0,0.6)"
              : "0 0 12px rgba(29,185,84,0.1), 0 4px 16px rgba(0,0,0,0.6)",
          }}
          aria-label="Open player"
        >
          {currentTrackInfo?.albumArt ? (
            <img
              src={currentTrackInfo.albumArt}
              alt=""
              className={`w-10 h-10 rounded-full object-cover ${isPlaying ? "animate-spin-slow" : ""}`}
            />
          ) : (
            <svg viewBox="0 0 24 24" className="w-7 h-7 text-[#1DB954]" fill="currentColor">
              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
            </svg>
          )}
          {isPlaying && (
            <div className="absolute inset-0 rounded-full border-2 border-[#1DB954]/40 animate-pulse" />
          )}
        </button>

        {/* Expanded: player panel (opens upward) */}
        <div
          className={`absolute bottom-0 right-0 transition-all duration-300 origin-bottom-right ${
            expanded
              ? "scale-100 opacity-100"
              : "scale-75 opacity-0 pointer-events-none"
          }`}
        >
          <div
            className="flex flex-col gap-3 p-4 rounded-2xl border border-white/[0.08]
              backdrop-blur-xl shadow-2xl min-w-[280px]"
            style={{
              background: "rgba(10,10,10,0.95)",
              boxShadow: "0 0 40px rgba(29,185,84,0.08), 0 8px 32px rgba(0,0,0,0.6)",
            }}
          >
            {/* Close button — snaps bubble back to home */}
            <button
              onClick={handleClose}
              className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/[0.06]
                flex items-center justify-center text-white/30 hover:text-white/60 transition-colors"
              aria-label="Close player"
            >
              <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Track info */}
            <div className="flex items-center gap-3 pr-6">
              {currentTrackInfo?.albumArt && (
                <img
                  src={currentTrackInfo.albumArt}
                  alt={currentTrackInfo.name}
                  className="w-12 h-12 rounded-lg object-cover"
                />
              )}
              <div className="min-w-0 flex-1">
                {currentTrackInfo ? (
                  <>
                    <p className="text-[13px] font-semibold text-white truncate">
                      {currentTrackInfo.name}
                    </p>
                    <p className="text-[11px] text-white/40 truncate">
                      {currentTrackInfo.artist}
                    </p>
                  </>
                ) : (
                  <p className="text-[12px] text-white/30">No track playing</p>
                )}
              </div>
            </div>

            {/* Playback controls */}
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => player?.previousTrack()}
                className="p-1.5 rounded-full text-white/40 hover:text-white/70 transition-colors"
                aria-label="Previous track"
              >
                <SkipBack className="w-4 h-4" />
              </button>
              <button
                onClick={() => (isPlaying ? pause() : resume())}
                className="p-2.5 rounded-full bg-[#1DB954] text-black hover:bg-[#1ed760] transition-colors"
                aria-label={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5" />
                ) : (
                  <Play className="w-5 h-5 ml-0.5" />
                )}
              </button>
              <button
                onClick={() => player?.nextTrack()}
                className="p-1.5 rounded-full text-white/40 hover:text-white/70 transition-colors"
                aria-label="Next track"
              >
                <SkipForward className="w-4 h-4" />
              </button>
            </div>

            {/* Lyrics + volume */}
            <div className="flex items-center justify-center gap-2">
              {currentSongDbId && (
                <button
                  onClick={() => setShowRhymeSheet((v) => !v)}
                  className={`p-1.5 rounded-full transition-colors ${
                    showRhymeSheet
                      ? "text-[#d91d1c] bg-[#d91d1c]/10"
                      : "text-white/30 hover:text-white/50"
                  }`}
                  aria-label={showRhymeSheet ? "Hide lyrics" : "Show lyrics"}
                >
                  <AlignLeft className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={toggleMute}
                className="p-1.5 rounded-full text-white/30 hover:text-white/50 transition-colors"
                aria-label={muted ? "Unmute" : "Mute"}
              >
                {muted ? (
                  <VolumeX className="w-3.5 h-3.5" />
                ) : (
                  <Volume2 className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Rhyme Sheet Panel */}
      {showRhymeSheet && currentSongDbId && (
        <RhymeSheetPanel
          songId={currentSongDbId}
          onClose={() => setShowRhymeSheet(false)}
        />
      )}
    </>
  );
}
