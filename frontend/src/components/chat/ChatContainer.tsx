"use client";

import { useEffect, useRef } from "react";
import { useChatStore } from "@/lib/store";
import { ChatMessage } from "./ChatMessage";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, Search, Mic, MessageSquare } from "lucide-react";

const SUGGESTIONS = [
  {
    icon: Sparkles,
    text: "What's the most aggressive track on Nayaab?",
  },
  {
    icon: Search,
    text: "Find bars with wordplay or cultural references",
  },
  {
    icon: Mic,
    text: "Which songs have Encore and Calm trading verses?",
  },
  {
    icon: MessageSquare,
    text: "What are the main themes across Nayaab?",
  },
];

export function ChatContainer() {
  const { messages, isLoading, sendMessage } = useChatStore();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  return (
    <ScrollArea className="flex-1">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[65vh]">
            {/* Empty state */}
            <div className="relative mb-8">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Sparkles className="w-7 h-7 text-primary" />
              </div>
              <div className="absolute -inset-4 bg-primary/5 rounded-3xl blur-xl -z-10" />
            </div>

            <h2 className="text-xl font-semibold text-foreground mb-2">
              What do you want to know?
            </h2>
            <p className="text-sm text-muted-foreground max-w-sm text-center mb-10 leading-relaxed">
              Explore Seedhe Maut&apos;s discography through moods, lyrics,
              bars, references, and more.
            </p>

            {/* Suggestion cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-lg">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s.text}
                  onClick={() => sendMessage(s.text)}
                  className="group flex items-start gap-3 p-3.5 rounded-xl border border-border/60 bg-card/40 hover:bg-card hover:border-primary/30 transition-all duration-200 text-left"
                >
                  <s.icon className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors mt-0.5 shrink-0" />
                  <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors leading-snug">
                    {s.text}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {messages.map((message, index) => (
              <ChatMessage key={index} message={message} />
            ))}

            {isLoading && (
              <div className="flex items-start gap-3 animate-fade-in-up">
                <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles className="w-3.5 h-3.5 text-primary animate-pulse-glow" />
                </div>
                <div className="flex items-center gap-2 pt-1.5">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" />
                  </div>
                  <span className="text-sm text-muted-foreground/60">
                    Thinking...
                  </span>
                </div>
              </div>
            )}

            <div ref={bottomRef} className="h-4" />
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
