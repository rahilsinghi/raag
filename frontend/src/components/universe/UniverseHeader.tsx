"use client";

import Link from "next/link";
import Image from "next/image";
import { RefreshCw, MessageSquare } from "lucide-react";
import { useUniverseStore } from "@/lib/universe-store";
import { SpotifyLoginButton } from "@/components/spotify/SpotifyLoginButton";

export function UniverseHeader() {
  const { refreshGraph, isLoading } = useUniverseStore();

  return (
    <header className="fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-4 sm:px-5 py-3 border-b border-white/[0.06] glass">
      <div className="flex items-center gap-3">
        <div className="relative w-8 h-8 rounded-full overflow-hidden ring-1 ring-white/10">
          <Image
            src="/logos/Artboard 4SM logos.png"
            alt="SM"
            fill
            className="object-cover"
          />
        </div>
        <div className="flex items-baseline gap-2">
          <h1 className="font-maut text-base font-extrabold tracking-wider text-white">
            RAAG
          </h1>
          <span className="text-[10px] tracking-[0.2em] uppercase text-white/30 font-semibold hidden sm:inline">
            Universe
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <SpotifyLoginButton />
        <button
          onClick={() => refreshGraph()}
          disabled={isLoading}
          className="p-2 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/[0.04] transition-all duration-300 disabled:opacity-30"
          title="Refresh graph data"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
        </button>
        <Link
          href="/"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.06] text-[11px] text-white/50 font-semibold tracking-wide uppercase hover:bg-white/[0.06] hover:text-white/70 transition-all duration-300"
        >
          <MessageSquare className="w-3 h-3" />
          Chat
        </Link>
      </div>
    </header>
  );
}
