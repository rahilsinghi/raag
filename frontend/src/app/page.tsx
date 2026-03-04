"use client";

import Image from "next/image";
import { ChatContainer } from "@/components/chat/ChatContainer";
import { ChatInput } from "@/components/chat/ChatInput";
import { useChatStore } from "@/lib/store";
import { RotateCcw } from "lucide-react";

export default function Home() {
  const { messages, clearMessages } = useChatStore();

  return (
    <main className="flex flex-col h-screen bg-background relative">
      {/* Subtle background glow */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[radial-gradient(ellipse_at_center,rgba(217,29,28,0.06)_0%,transparent_70%)]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-[radial-gradient(ellipse_at_center,rgba(217,29,28,0.03)_0%,transparent_70%)]" />
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-5 py-3 border-b border-white/[0.06] glass">
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
            <span className="text-[10px] tracking-[0.2em] uppercase text-white/30 font-semibold">
              Intelligence
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.06]">
            <div className="w-1.5 h-1.5 rounded-full bg-[#d91d1c] animate-pulse" />
            <span className="text-[11px] text-white/50 font-semibold tracking-wide uppercase">
              Seedhe Maut
            </span>
          </div>
          {messages.length > 0 && (
            <button
              onClick={clearMessages}
              className="p-2 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/[0.04] transition-all duration-300"
              title="New conversation"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </header>

      {/* Chat area */}
      <ChatContainer />

      {/* Input area */}
      <ChatInput />
    </main>
  );
}
