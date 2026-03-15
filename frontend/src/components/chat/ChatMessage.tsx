"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ChatMessage as ChatMessageType, ToolResult } from "@/lib/api";
import { SongCard } from "@/components/song/SongCard";
import { LyricCard } from "@/components/song/LyricCard";
import { SongContextCard } from "@/components/song/SongContextCard";
import type { SongResult, LyricResult, BarResult, SongDetail, BarDescription } from "@/lib/types";
import { MC_STYLES, ANNOTATION_STYLES } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { User, Music, Quote, Mic2, FileText, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const ease = [0.16, 1, 0.3, 1] as [number, number, number, number];

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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
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
        const bars = items as BarResult[];
        const chunks: BarResult[][] = [];
        for (let i = 0; i < bars.length; i += 4) {
          chunks.push(bars.slice(i, i + 4));
        }
        content = (
          <div className="space-y-2">
            {chunks.map((chunk, ci) => {
              const first = chunk[0];
              const mc = MC_STYLES[first.mc ?? ""];
              return (
                <motion.div
                  key={`chunk-${ci}`}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: ci * 0.06, ease }}
                  className={`rounded-lg border px-3 py-2.5 ${
                    mc
                      ? `${mc.border} ${mc.bg}`
                      : "border-white/[0.04] bg-white/[0.01]"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    {first.mc && mc && (
                      <div className="flex items-center gap-1">
                        <div className={`w-1.5 h-1.5 rounded-full ${mc.dot}`} />
                        <span className={`text-[10px] font-semibold ${mc.text}`}>
                          {first.mc}
                        </span>
                      </div>
                    )}
                    <span className="text-[10px] text-white/25">
                      {first.section && `${first.section} · `}{first.song_title}
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    {chunk.map((bar, bi) => (
                      <div key={bar.id || `bar-${ci}-${bi}`} className="flex items-baseline gap-2">
                        <p className="text-[13px] text-white/80 leading-snug">
                          {bar.text}
                        </p>
                        {bar.annotations && bar.annotations.length > 0 && (
                          <div className="flex gap-1 shrink-0">
                            {bar.annotations.map((ann) => {
                              const style = ANNOTATION_STYLES[ann];
                              return (
                                <Badge
                                  key={ann}
                                  className={`text-[8px] font-semibold border-0 px-1 py-0 h-3.5 ${
                                    style
                                      ? `${style.bg} ${style.text}`
                                      : "bg-white/[0.05] text-white/40"
                                  }`}
                                >
                                  {ann.replace(/_/g, " ")}
                                </Badge>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </motion.div>
              );
            })}
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
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease }}
            className="glass-card rounded-xl overflow-hidden border border-[#d91d1c]/10"
          >
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
          </motion.div>
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
  const delay = Math.min(index * 0.05, 0.3);

  if (isUser) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay, ease }}
        className="flex items-start gap-3 justify-end"
      >
        <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-white/[0.06] border border-white/[0.08] px-4 py-2.5">
          <p className="text-sm text-white leading-relaxed whitespace-pre-wrap">
            {message.content}
          </p>
        </div>
        <div className="w-7 h-7 rounded-full bg-white/[0.06] border border-white/[0.08] flex items-center justify-center shrink-0 mt-0.5">
          <User className="w-3.5 h-3.5 text-white/40" />
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease }}
      className="flex items-start gap-3"
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
    </motion.div>
  );
}
