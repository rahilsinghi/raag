"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  RotateCcw,
  Network,
  LogIn,
  PanelLeftOpen,
  MessageSquare,
  RefreshCw,
  ArrowLeft,
  Music,
  Disc3,
} from "lucide-react";
import { useChatStore } from "@/lib/store";
import { useAuthStore } from "@/lib/auth-store";
import { useUniverseStore } from "@/lib/universe-store";
import { SpotifyLoginButton } from "@/components/spotify/SpotifyLoginButton";
import { LoginModal } from "@/components/auth/LoginModal";
import { UserMenu } from "@/components/auth/UserMenu";

interface AppHeaderProps {
  /** For deep dive page — song metadata */
  songTitle?: string;
  songAlbum?: string;
  songAlbumArt?: string | null;
  songTrackNumber?: number | null;
  isPlayingSong?: boolean;
  /** For deep dive page — mode toggle */
  mode?: "static" | "synced";
  onModeChange?: (mode: "static" | "synced") => void;
  /** For deep dive page — extra actions */
  extraActions?: React.ReactNode;
}

const subtitleMap: Record<string, string> = {
  "/": "Intelligence",
  "/universe": "Universe",
  "/discography": "Discography",
};

export function AppHeader({
  songTitle,
  songAlbum,
  songAlbumArt,
  songTrackNumber,
  isPlayingSong,
  mode,
  onModeChange,
  extraActions,
}: AppHeaderProps) {
  const pathname = usePathname();
  const { messages, newConversation, sidebarOpen, setSidebarOpen } = useChatStore();
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();
  const { refreshGraph, isLoading: graphLoading } = useUniverseStore();
  const [loginOpen, setLoginOpen] = useState(false);

  const isChat = pathname === "/";
  const isUniverse = pathname === "/universe";
  const isDeepDive = pathname.startsWith("/song/");
  const isDiscography = pathname.startsWith("/discography");

  const subtitle = isDeepDive ? null : subtitleMap[pathname] ?? (isDiscography ? "Discography" : "Intelligence");

  const handleBack = useCallback(() => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  }, [router]);

  return (
    <>
      <header className="relative z-30 flex items-center justify-between px-4 sm:px-5 py-3 border-b border-white/[0.06] glass">
        {/* Left section */}
        <div className="flex items-center gap-3 min-w-0">
          {/* Back button for deep dive and album detail pages */}
          {(isDeepDive || (isDiscography && pathname !== "/discography")) && (
            <motion.button
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              onClick={handleBack}
              className="p-2 -ml-2 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/[0.04] transition-all"
              aria-label="Go back"
            >
              <ArrowLeft className="w-4 h-4" />
            </motion.button>
          )}

          {/* Sidebar toggle for chat */}
          <AnimatePresence>
            {isChat && isAuthenticated && !sidebarOpen && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2 }}
                onClick={() => setSidebarOpen(true)}
                className="p-2 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/[0.04] transition-all duration-300"
                title="Chat history"
              >
                <PanelLeftOpen className="w-3.5 h-3.5" />
              </motion.button>
            )}
          </AnimatePresence>

          {/* Deep dive: album art + song info */}
          {isDeepDive ? (
            <motion.div
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay: 0.05 }}
              className="flex items-center gap-3 min-w-0"
            >
              <div className="relative w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-white/[0.03]">
                {songAlbumArt ? (
                  <Image src={songAlbumArt} alt={songAlbum || ""} fill className="object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Music className="w-4 h-4 text-white/10" />
                  </div>
                )}
                {isPlayingSong && (
                  <div className="absolute inset-0 ring-2 ring-[#d91d1c]/40 rounded-lg animate-pulse" />
                )}
              </div>
              <div className="min-w-0">
                <h1 className="font-bold text-sm text-white truncate">{songTitle}</h1>
                <p className="text-[11px] text-white/35 truncate">
                  {songAlbum}
                  {songTrackNumber && (
                    <span className="text-white/20"> · Track {songTrackNumber}</span>
                  )}
                </p>
              </div>
            </motion.div>
          ) : (
            /* Standard: logo + brand */
            <Link href="/" className="flex items-center gap-3 group">
              <div className="relative w-8 h-8 rounded-full overflow-hidden ring-1 ring-white/10 group-hover:ring-white/20 transition-all">
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
                <AnimatePresence mode="wait">
                  {subtitle && (
                    <motion.span
                      key={subtitle}
                      initial={{ opacity: 0, y: 4, filter: "blur(4px)" }}
                      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                      exit={{ opacity: 0, y: -4, filter: "blur(4px)" }}
                      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                      className="text-[10px] tracking-[0.2em] uppercase text-white/30 font-semibold hidden sm:inline"
                    >
                      {subtitle}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
            </Link>
          )}
        </div>

        {/* Right section */}
        <div className="flex items-center gap-2">
          <SpotifyLoginButton />

          {/* Page-specific actions */}
          {isChat && (
            <>
              <Link
                href="/discography"
                className="p-2 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/[0.04] transition-all duration-300"
                title="Discography"
              >
                <Disc3 className="w-3.5 h-3.5" />
              </Link>
              <Link
                href="/universe"
                className="p-2 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/[0.04] transition-all duration-300"
                title="Universe Map"
              >
                <Network className="w-3.5 h-3.5" />
              </Link>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.06]">
                <div className="w-1.5 h-1.5 rounded-full bg-[#d91d1c] animate-heartbeat" />
                <span className="text-[11px] text-white/50 font-semibold tracking-wide uppercase">
                  Seedhe Maut
                </span>
              </div>
              <AnimatePresence>
                {messages.length > 0 && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.2 }}
                    onClick={newConversation}
                    className="p-2 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/[0.04] transition-all duration-300"
                    title="New conversation"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </motion.button>
                )}
              </AnimatePresence>
            </>
          )}

          {isUniverse && (
            <>
              <button
                onClick={() => refreshGraph()}
                disabled={graphLoading}
                className="p-2 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/[0.04] transition-all duration-300 disabled:opacity-30"
                title="Refresh graph data"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${graphLoading ? "animate-spin" : ""}`}
                />
              </button>
              <Link
                href="/"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.06] text-[11px] text-white/50 font-semibold tracking-wide uppercase hover:bg-white/[0.06] hover:text-white/70 transition-all duration-300"
              >
                <MessageSquare className="w-3 h-3" />
                Chat
              </Link>
            </>
          )}

          {isDiscography && (
            <>
              <Link
                href="/universe"
                className="p-2 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/[0.04] transition-all duration-300"
                title="Universe Map"
              >
                <Network className="w-3.5 h-3.5" />
              </Link>
              <Link
                href="/"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.06] text-[11px] text-white/50 font-semibold tracking-wide uppercase hover:bg-white/[0.06] hover:text-white/70 transition-all duration-300"
              >
                <MessageSquare className="w-3 h-3" />
                Chat
              </Link>
            </>
          )}

          {isDeepDive && (
            <>
              {/* Mode toggle */}
              {onModeChange && (
                <div className="hidden sm:flex items-center rounded-full bg-white/[0.04] p-0.5">
                  {(["static", "synced"] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => onModeChange(m)}
                      className={`px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider transition-all ${
                        mode === m
                          ? "bg-white/[0.08] text-white/70"
                          : "text-white/25 hover:text-white/40"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              )}
              {extraActions}
              <Link
                href="/"
                className="p-2 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/[0.04] transition-all"
                title="Back to chat"
              >
                <MessageSquare className="w-3.5 h-3.5" />
              </Link>
            </>
          )}

          {/* Auth */}
          {isAuthenticated ? (
            <UserMenu />
          ) : (
            <button
              onClick={() => setLoginOpen(true)}
              className="p-2 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/[0.04] transition-all duration-300"
              title="Sign in"
            >
              <LogIn className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </header>

      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </>
  );
}
