"use client";

import { ChatContainer } from "@/components/chat/ChatContainer";
import { ChatInput } from "@/components/chat/ChatInput";
import { useChatStore } from "@/lib/store";
import { Music2 } from "lucide-react";

export default function Home() {
  const { messages, clearMessages } = useChatStore();

  return (
    <main className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="relative flex items-center justify-between px-6 py-3 border-b border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 border border-primary/20">
            <Music2 className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h1 className="text-base font-semibold tracking-tight text-foreground">
              Raag
            </h1>
            <p className="text-[10px] text-muted-foreground leading-none mt-0.5">
              Artist Intelligence Engine
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground/70 bg-muted/50 px-2.5 py-1 rounded-full border border-border/50">
            Seedhe Maut
          </span>
          {messages.length > 0 && (
            <button
              onClick={clearMessages}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-muted/50"
            >
              Clear
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
