"use client";

import { useState, useRef, useCallback } from "react";
import { useChatStore } from "@/lib/store";
import { ArrowUp } from "lucide-react";

export function ChatInput() {
  const [input, setInput] = useState("");
  const { sendMessage, isLoading } = useChatStore();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, []);

  const handleSubmit = async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    await sendMessage(trimmed);
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const canSend = input.trim().length > 0 && !isLoading;

  return (
    <div className="relative z-10 border-t border-white/[0.04] bg-black/50 backdrop-blur-xl">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3">
        <div className="glass-input rounded-xl flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              adjustHeight();
            }}
            onKeyDown={handleKeyDown}
            placeholder="Ask about Seedhe Maut's music..."
            disabled={isLoading}
            rows={1}
            className="flex-1 bg-transparent px-4 py-3 text-sm text-white placeholder:text-white/20 resize-none outline-none disabled:opacity-50 max-h-40"
            autoFocus
          />
          <button
            onClick={handleSubmit}
            disabled={!canSend}
            className="m-1.5 p-2 rounded-lg bg-[#d91d1c] text-white disabled:opacity-20 disabled:cursor-not-allowed hover:bg-[#ef2e2d] active:scale-95 transition-all duration-200 shrink-0 shadow-[0_0_20px_rgba(217,29,28,0.3)]"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[10px] text-white/15 text-center mt-2 tracking-wide">
          Searches audio features, lyrics, and annotations
        </p>
      </div>
    </div>
  );
}
