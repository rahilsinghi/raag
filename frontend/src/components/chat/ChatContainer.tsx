"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { useChatStore } from "@/lib/store";
import { ChatMessage } from "./ChatMessage";
import { TypingIndicator } from "./TypingIndicator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Mic, MessageSquare, Flame } from "lucide-react";
import { FEATURED_ALBUMS, ALBUM_ART } from "@/lib/album-art";

const SUGGESTIONS = [
  {
    icon: Flame,
    text: "What's the most aggressive track on Nayaab?",
    color: "text-[#d91d1c]",
  },
  {
    icon: Search,
    text: "Find bars with wordplay or cultural references",
    color: "text-white/60",
  },
  {
    icon: Mic,
    text: "Which songs have Encore and Calm trading verses?",
    color: "text-white/60",
  },
  {
    icon: MessageSquare,
    text: "What are the main themes across the discography?",
    color: "text-white/60",
  },
];

// Double the albums for seamless infinite scroll
const CAROUSEL_ALBUMS = [...FEATURED_ALBUMS, ...FEATURED_ALBUMS];

export function ChatContainer() {
  const { messages, isLoading, activeToolName, sendMessage } = useChatStore();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  return (
    <ScrollArea className="flex-1 relative z-10">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[70vh]">
            {/* Album art carousel - auto-scrolling */}
            <div className="w-full mb-12 overflow-hidden scroll-mask">
              <div className="flex gap-3 animate-carousel w-max">
                {CAROUSEL_ALBUMS.map((album, idx) => {
                  const artFile = ALBUM_ART[album.slug];
                  if (!artFile) return null;
                  return (
                    <div
                      key={`${album.slug}-${idx}`}
                      className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden shrink-0 album-art-hover group animate-float"
                      style={{
                        animationDelay: `${(idx % FEATURED_ALBUMS.length) * 0.5}s`,
                        animationDuration: `${3.5 + (idx % 3) * 0.5}s`,
                      }}
                    >
                      <Image
                        src={`/albums/${artFile}`}
                        alt={album.title}
                        fill
                        className="object-cover brightness-75 group-hover:brightness-100 transition-all duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <span className="absolute bottom-1 left-1 right-1 text-[8px] font-semibold text-white/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300 truncate text-center">
                        {album.title}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Branding */}
            <div className="relative mb-2 animate-text-appear">
              <h2 className="font-maut text-4xl sm:text-5xl font-extrabold tracking-wider text-white">
                RAAG
              </h2>
              <div className="absolute -inset-8 bg-[radial-gradient(ellipse_at_center,rgba(217,29,28,0.08)_0%,transparent_70%)] -z-10" />
            </div>
            <p className="text-xs tracking-[0.3em] uppercase text-[#d91d1c] font-semibold mb-2 animate-text-appear [animation-delay:0.1s]">
              Artist Intelligence Engine
            </p>
            <p className="text-sm text-white/35 max-w-sm text-center mb-10 leading-relaxed animate-text-appear [animation-delay:0.2s]">
              Explore Seedhe Maut&apos;s music through moods, lyrics, bars, and
              references.
            </p>

            {/* Suggestion cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={s.text}
                  onClick={() => sendMessage(s.text)}
                  className="group flex items-start gap-3 p-3.5 rounded-xl glass-card suggestion-card cursor-pointer text-left animate-text-appear"
                  style={{ animationDelay: `${0.3 + i * 0.08}s` }}
                >
                  <s.icon
                    className={`w-4 h-4 ${s.color} group-hover:text-[#d91d1c] transition-colors mt-0.5 shrink-0`}
                  />
                  <span className="text-[13px] text-white/40 group-hover:text-white/80 transition-colors leading-snug">
                    {s.text}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {messages.map((message, index) => (
              <ChatMessage key={index} message={message} index={index} />
            ))}

            {isLoading && <TypingIndicator toolName={activeToolName} />}

            <div ref={bottomRef} className="h-4" />
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
