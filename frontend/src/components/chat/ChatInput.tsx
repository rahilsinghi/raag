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
    <div className="border-t border-border/50 bg-card/30 backdrop-blur-sm">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3">
        <div className="relative flex items-end gap-2 rounded-xl border border-border/60 bg-card/60 focus-within:border-primary/40 focus-within:ring-1 focus-within:ring-primary/20 transition-all duration-200">
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
            className="flex-1 bg-transparent px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 resize-none outline-none disabled:opacity-50 max-h-40"
            autoFocus
          />
          <button
            onClick={handleSubmit}
            disabled={!canSend}
            className="m-1.5 p-2 rounded-lg bg-primary text-primary-foreground disabled:opacity-30 disabled:cursor-not-allowed hover:bg-primary/90 active:scale-95 transition-all duration-150 shrink-0"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[10px] text-muted-foreground/40 text-center mt-2">
          Raag searches across audio features, lyrics, and annotations to answer your questions.
        </p>
      </div>
    </div>
  );
}
