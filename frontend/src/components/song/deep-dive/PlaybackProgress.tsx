"use client";

import { useEffect, useState } from "react";
import { useSpotifyStore } from "@/lib/spotify-store";

interface Props {
  isPlaying: boolean;
}

export function PlaybackProgress({ isPlaying }: Props) {
  const { getInterpolatedPosition, playbackDuration } = useSpotifyStore();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isPlaying || !playbackDuration) return;

    let rafId: number;
    const tick = () => {
      const pos = getInterpolatedPosition();
      setProgress(Math.min(pos / playbackDuration, 1));
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying, playbackDuration, getInterpolatedPosition]);

  if (!isPlaying) return null;

  return (
    <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/[0.04]">
      <div
        className="h-full bg-[#d91d1c] transition-none"
        style={{
          width: `${progress * 100}%`,
          boxShadow: "0 0 8px rgba(217, 29, 28, 0.4)",
        }}
      />
    </div>
  );
}
