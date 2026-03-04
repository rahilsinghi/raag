"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ChatMessage as ChatMessageType, ToolResult } from "@/lib/api";
import { SongCard } from "@/components/song/SongCard";
import { LyricCard } from "@/components/song/LyricCard";
import { BarAnnotation } from "@/components/song/BarAnnotation";
import { SongContextCard } from "@/components/song/SongContextCard";
import type { SongResult, LyricResult, BarResult, SongDetail, BarDescription } from "@/lib/types";
import { User, Music, Quote, Mic2, FileText, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const TOOL_META: Record<string, { label: string; Icon: LucideIcon }> = {
  search_by_mood: { label: "Matching tracks", Icon: Music },
  search_by_lyrics: { label: "Lyrics found", Icon: Quote },
  search_bars: { label: "Bars", Icon: Mic2 },
  get_song_context: { label: "Song details", Icon: FileText },
  describe_bar: { label: "Bar analysis", Icon: Sparkles },
};

function renderToolResult(result: ToolResult): ReactNode {
  const meta = TOOL_META[result.toolName];
  const data = result.data;
  const items = Array.isArray(data) ? data : null;

  let sectionLabel: ReactNode = null;
  if (meta && items && items.length > 0) {
    const { Icon, label } = meta;
    sectionLabel = (
      <div className="flex items-center gap-2 mb-2.5">
        <Icon className="w-3 h-3 text-white/20" />
        <span className="text-[10px] font-semibold text-white/25 uppercase tracking-wider">
          {label}
        </span>
        <div className="flex-1 h-px bg-white/[0.04]" />
        <span className="text-[10px] text-white/15 tabular-nums">
          {items.length}
        </span>
      </div>
    );
  }

  let content: ReactNode = null;

  switch (result.toolName) {
    case "search_by_mood":
      if (items) {
        content = (
          <div className="space-y-2.5">
            {(items as SongResult[]).map((song, j) => (
              <SongCard
                key={song.id || `song-${j}`}
                song={song}
                rank={j + 1}
                cascadeIndex={j}
              />
            ))}
          </div>
        );
      }
      break;

    case "search_by_lyrics":
      if (items) {
        content = (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {(items as LyricResult[]).map((lyric, j) => (
              <LyricCard
                key={`lyric-${lyric.song_id}-${j}`}
                lyric={lyric}
                cascadeIndex={j}
              />
            ))}
          </div>
        );
      }
      break;

    case "search_bars":
      if (items) {
        content = (
          <div className="space-y-2">
            {(items as BarResult[]).map((bar, j) => (
              <BarAnnotation
                key={bar.id || `bar-${j}`}
                bar={bar}
                cascadeIndex={j}
              />
            ))}
          </div>
        );
      }
      break;

    case "get_song_context":
      if (data && !Array.isArray(data)) {
        content = (
          <SongContextCard song={data as SongDetail} cascadeIndex={0} />
        );
      }
      break;

    case "describe_bar":
      if (data && !Array.isArray(data)) {
        const desc = data as BarDescription;
        content = (
          <div className="glass-card rounded-xl overflow-hidden border border-[#d91d1c]/10 animate-cascade-in">
            <div className="px-4 py-3 space-y-2">
              <p className="text-sm text-white/90 font-medium italic">
                &ldquo;{desc.text}&rdquo;
              </p>
              {desc.translation && (
                <p className="text-xs text-white/50 italic">
                  {desc.translation}
                </p>
              )}
              <p className="text-xs text-white/60 leading-relaxed">
                {desc.meaning}
              </p>
              {desc.wordplay && (
                <p className="text-xs text-white/45">
                  <span className="text-emerald-400/70 font-semibold">Wordplay: </span>
                  {desc.wordplay}
                </p>
              )}
              {desc.cultural_references && desc.cultural_references.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {desc.cultural_references.map((ref, i) => (
                    <span
                      key={i}
                      className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400/80 border border-amber-500/15"
                    >
                      {ref}
                    </span>
                  ))}
                </div>
              )}
              {desc.flow_notes && (
                <p className="text-xs text-white/40">
                  <span className="text-rose-400/70 font-semibold">Flow: </span>
                  {desc.flow_notes}
                </p>
              )}
              <p className="text-[10px] text-white/30 italic border-t border-white/[0.04] pt-2 mt-1">
                {desc.tldr}
              </p>
            </div>
          </div>
        );
      }
      break;
  }

  if (!sectionLabel && !content) return null;

  return (
    <>
      {sectionLabel}
      {content}
    </>
  );
}

interface Props {
  message: ChatMessageType;
  index?: number;
}

export function ChatMessage({ message, index = 0 }: Props) {
  const isUser = message.role === "user";
  const staggerDelay = `${Math.min(index * 0.05, 0.3)}s`;

  if (isUser) {
    return (
      <div
        className="flex items-start gap-3 justify-end animate-fade-in-up"
        style={{ animationDelay: staggerDelay }}
      >
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
    <div
      className="flex items-start gap-3 animate-fade-in-up"
      style={{ animationDelay: staggerDelay }}
    >
      <div className="relative w-7 h-7 rounded-full overflow-hidden ring-1 ring-white/10 shrink-0 mt-0.5">
        <Image
          src="/logos/Artboard 4SM logos.png"
          alt="SM"
          fill
          className="object-cover"
        />
      </div>
      <div className="flex-1 min-w-0">
        {message.content && (
          <div className="prose-chat">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>
          </div>
        )}

        {message.toolResults?.map((result, i) => (
          <div key={`tool-${i}-${result.toolName}`} className="mt-4">
            {renderToolResult(result)}
          </div>
        ))}
      </div>
    </div>
  );
}
