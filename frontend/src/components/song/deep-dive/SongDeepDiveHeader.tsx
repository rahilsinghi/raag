"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import type { SongDetail } from "@/lib/types";
import { getAlbumArt } from "@/lib/album-art";
import { PlayButton } from "@/components/spotify/PlayButton";
import { ArrowLeft, Network, Music } from "lucide-react";

interface Props {
  song: SongDetail;
  mode: "static" | "synced";
  onModeChange: (mode: "static" | "synced") => void;
  isPlaying: boolean;
}

export function SongDeepDiveHeader({ song, mode, onModeChange, isPlaying }: Props) {
  const router = useRouter();
  const albumArt = getAlbumArt(song.album_title || "");

  return (
    <header className="sticky top-0 z-20 flex items-center gap-3 px-4 sm:px-6 py-3 border-b border-white/[0.06] glass">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="p-2 -ml-2 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/[0.04] transition-all"
        aria-label="Go back"
      >
        <ArrowLeft className="w-4 h-4" />
      </button>

      {/* Album art */}
      <div className="relative w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-white/[0.03]">
        {albumArt ? (
          <Image src={albumArt} alt={song.album_title || ""} fill className="object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Music className="w-4 h-4 text-white/10" />
          </div>
        )}
        {isPlaying && (
          <div className="absolute inset-0 ring-2 ring-[#d91d1c]/40 rounded-lg animate-pulse" />
        )}
      </div>

      {/* Song info */}
      <div className="flex-1 min-w-0">
        <h1 className="font-bold text-sm text-white truncate">{song.title}</h1>
        <p className="text-[11px] text-white/35 truncate">
          {song.album_title}
          {song.track_number && <span className="text-white/20"> · Track {song.track_number}</span>}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Mode toggle */}
        <div className="hidden sm:flex items-center rounded-full bg-white/[0.04] p-0.5">
          <button
            onClick={() => onModeChange("static")}
            className={`px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider transition-all ${
              mode === "static"
                ? "bg-white/[0.08] text-white/70"
                : "text-white/25 hover:text-white/40"
            }`}
          >
            Static
          </button>
          <button
            onClick={() => onModeChange("synced")}
            className={`px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider transition-all ${
              mode === "synced"
                ? "bg-white/[0.08] text-white/70"
                : "text-white/25 hover:text-white/40"
            }`}
          >
            Synced
          </button>
        </div>

        <PlayButton spotifyTrackId={song.spotify_track_id} songId={song.id} size="sm" />

        <button
          onClick={() => router.push(`/universe?song=${song.id}`)}
          className="p-2 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/[0.04] transition-all"
          title="View in Universe"
        >
          <Network className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
}
