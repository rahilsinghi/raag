"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { ChatContainer } from "@/components/chat/ChatContainer";
import { ChatInput } from "@/components/chat/ChatInput";
import { useChatStore } from "@/lib/store";
import Link from "next/link";
import { RotateCcw, Network, LogIn, PanelLeftOpen } from "lucide-react";
import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { SpotifySDK } from "@/components/spotify/SpotifySDK";
import { SpotifyCallback } from "@/components/spotify/SpotifyCallback";
import { SpotifyMiniPlayer } from "@/components/spotify/SpotifyMiniPlayer";
import { SpotifyLoginButton } from "@/components/spotify/SpotifyLoginButton";
import { useAuthStore } from "@/lib/auth-store";
import { LoginModal } from "@/components/auth/LoginModal";
import { UserMenu } from "@/components/auth/UserMenu";

export default function Home() {
  const { messages, clearMessages, newConversation, sidebarOpen, setSidebarOpen } = useChatStore();
  const { isAuthenticated } = useAuthStore();
  const [loginOpen, setLoginOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [preloaderDone, setPreloaderDone] = useState(false);
  const [mousePos, setMousePos] = useState({ x: -300, y: -300 });
  const [mouseActive, setMouseActive] = useState(false);

  useEffect(() => {
    // Trigger preloader exit after a short delay
    const t1 = setTimeout(() => setLoaded(true), 800);
    const t2 = setTimeout(() => setPreloaderDone(true), 1600);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY });
    setMouseActive(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setMouseActive(false);
  }, []);

  return (
    <main
      className="flex flex-col h-screen bg-background relative"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Preloader */}
      {!preloaderDone && (
        <div
          className={`fixed inset-0 z-[100] bg-background flex items-center justify-center ${loaded ? "preloader-exit" : ""}`}
        >
          <div className="preloader-logo flex flex-col items-center gap-4">
            <div className="relative w-16 h-16 rounded-full overflow-hidden ring-2 ring-white/10">
              <Image
                src="/logos/Artboard 4SM logos.png"
                alt="SM"
                fill
                className="object-cover"
                priority
              />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-maut text-xl font-extrabold tracking-wider text-white">
                RAAG
              </span>
              <span className="text-[9px] tracking-[0.2em] uppercase text-white/20 font-semibold">
                Intelligence
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Spotify */}
      <SpotifySDK />
      <SpotifyCallback />
      <SpotifyMiniPlayer />

      {/* Noise texture overlay */}
      <div className="noise-overlay" />

      {/* Mouse-following glow */}
      <div
        className="mouse-glow hidden sm:block"
        style={{
          left: mousePos.x,
          top: mousePos.y,
          opacity: mouseActive ? 1 : 0,
        }}
      />

      {/* Subtle background glow */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[radial-gradient(ellipse_at_center,rgba(217,29,28,0.06)_0%,transparent_70%)]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-[radial-gradient(ellipse_at_center,rgba(217,29,28,0.03)_0%,transparent_70%)]" />
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-4 sm:px-5 py-3 border-b border-white/[0.06] glass">
        <div className="flex items-center gap-3">
          {isAuthenticated && !sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/[0.04] transition-all duration-300"
              title="Chat history"
            >
              <PanelLeftOpen className="w-3.5 h-3.5" />
            </button>
          )}
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
              Intelligence
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <SpotifyLoginButton />
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
          {messages.length > 0 && (
            <button
              onClick={newConversation}
              className="p-2 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/[0.04] transition-all duration-300"
              title="New conversation"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
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

      {/* Chat area with optional sidebar */}
      <div className="flex flex-1 min-h-0 relative z-10">
        <ChatSidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <ChatContainer />
          <ChatInput />
          <div className="footer-credit">
            Powered by <span>Raag</span> Intelligence
          </div>
        </div>
      </div>

      {/* Login modal */}
      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </main>
  );
}
