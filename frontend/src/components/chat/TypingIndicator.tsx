"use client";

import { motion } from "framer-motion";
import Image from "next/image";

interface TypingIndicatorProps {
  toolName?: string | null;
}

const BAR_COUNT = 5;

const toolLabels: Record<string, string> = {
  search_by_mood: "Searching by mood",
  search_by_lyrics: "Searching lyrics",
  search_bars: "Searching bars",
  get_song_context: "Loading song context",
  describe_bar: "Analyzing bar",
  download_album_audio: "Downloading audio",
};

export function TypingIndicator({ toolName }: TypingIndicatorProps) {
  const label = toolName ? (toolLabels[toolName] ?? `Running ${toolName}`) : "Thinking";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
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

      <div className="flex flex-col gap-1.5 pt-1">
        {/* Waveform bars */}
        <div className="flex items-end gap-[3px] h-4">
          {Array.from({ length: BAR_COUNT }).map((_, i) => (
            <motion.div
              key={i}
              className="w-[3px] rounded-full bg-[#d91d1c]"
              animate={{
                height: [4, 14, 6, 16, 4],
                opacity: [0.4, 1, 0.5, 1, 0.4],
              }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                ease: "easeInOut",
                delay: i * 0.12,
              }}
              style={{ height: 4 }}
            />
          ))}
        </div>

        {/* Tool execution label */}
        <motion.div
          key={label}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-center gap-2"
        >
          <span className="text-xs text-white/25">{label}...</span>
          {toolName && (
            <div className="h-3 flex-1 max-w-[120px] rounded-full overflow-hidden bg-white/[0.03]">
              <div className="h-full tool-card-shimmer rounded-full" />
            </div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}
