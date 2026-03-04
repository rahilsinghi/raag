"use client";

import Image from "next/image";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ChatMessage as ChatMessageType } from "@/lib/api";
import { SongCard } from "@/components/song/SongCard";
import { BarAnnotation } from "@/components/song/BarAnnotation";
import type { SongResult, BarResult } from "@/lib/types";
import { User } from "lucide-react";

interface Props {
  message: ChatMessageType;
}

export function ChatMessage({ message }: Props) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex items-start gap-3 justify-end animate-fade-in-up">
        <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-white/[0.06] border border-white/[0.08] px-4 py-2.5">
          <p className="text-sm text-white leading-relaxed whitespace-pre-wrap">
            {message.content}
          </p>
        </div>
        <div className="w-7 h-7 rounded-full bg-white/[0.06] border border-white/[0.08] flex items-center justify-center shrink-0 mt-0.5">
          <User className="w-3.5 h-3.5 text-white/40" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 animate-fade-in-up">
      <div className="relative w-7 h-7 rounded-full overflow-hidden ring-1 ring-white/10 shrink-0 mt-0.5">
        <Image
          src="/logos/Artboard 4SM logos.png"
          alt="SM"
          fill
          className="object-cover"
        />
      </div>
      <div className="flex-1 min-w-0">
        {/* Markdown content */}
        {message.content && (
          <div className="prose-chat">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>
          </div>
        )}

        {/* Tool results */}
        {message.toolResults?.map((result, i) => (
          <div key={`tool-${i}-${result.toolName}`} className="mt-4 space-y-2.5">
            {(result.toolName === "search_by_mood" ||
              result.toolName === "search_by_lyrics") &&
              Array.isArray(result.data) && (
                <div className="space-y-2.5">
                  {(result.data as SongResult[]).map((song, j) => (
                    <SongCard
                      key={song.id || `song-${j}`}
                      song={song}
                      rank={j + 1}
                    />
                  ))}
                </div>
              )}
            {result.toolName === "search_bars" &&
              Array.isArray(result.data) && (
                <div className="space-y-2">
                  {(result.data as BarResult[]).map((bar, j) => (
                    <BarAnnotation
                      key={bar.id || `bar-${j}`}
                      bar={bar}
                    />
                  ))}
                </div>
              )}
          </div>
        ))}
      </div>
    </div>
  );
}
