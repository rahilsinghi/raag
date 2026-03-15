"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useChatStore } from "@/lib/store";
import { useAuthStore } from "@/lib/auth-store";
import {
  Plus,
  MessageSquare,
  Trash2,
  X,
  Loader2,
} from "lucide-react";

const ease = [0.16, 1, 0.3, 1] as [number, number, number, number];

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return new Date(dateStr).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function ChatSidebar() {
  const { isAuthenticated } = useAuthStore();
  const {
    conversations,
    conversationsLoading,
    conversationId,
    sidebarOpen,
    loadConversations,
    selectConversation,
    deleteConversation,
    newConversation,
    setSidebarOpen,
  } = useChatStore();

  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated && sidebarOpen) {
      loadConversations();
    }
  }, [isAuthenticated, sidebarOpen, loadConversations]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDeletingId(id);
    await deleteConversation(id);
    setDeletingId(null);
  };

  const shouldShow = isAuthenticated && sidebarOpen;

  return (
    <AnimatePresence>
      {shouldShow && (
    <motion.aside
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: 256, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={{ duration: 0.3, ease }}
      className="shrink-0 border-r border-white/[0.06] glass flex flex-col h-full z-20 relative overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-3 border-b border-white/[0.06]">
        <span className="text-xs font-semibold text-white/50 uppercase tracking-wider">
          History
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              newConversation();
            }}
            className="p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/[0.04] transition-colors"
            title="New chat"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/[0.04] transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto py-1">
        {conversationsLoading && conversations.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-4 h-4 text-white/20 animate-spin" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="px-3 py-8 text-center">
            <MessageSquare className="w-5 h-5 text-white/10 mx-auto mb-2" />
            <p className="text-[11px] text-white/20">No conversations yet</p>
          </div>
        ) : (
          conversations.map((conv) => {
            const isActive = conv.id === conversationId;
            return (
              <button
                key={conv.id}
                onClick={() => selectConversation(conv.id)}
                className={`group w-full flex items-center gap-2 px-3 py-2 text-left transition-colors ${
                  isActive
                    ? "bg-white/[0.06] text-white"
                    : "text-white/40 hover:text-white/70 hover:bg-white/[0.03]"
                }`}
              >
                <MessageSquare className="w-3 h-3 shrink-0 opacity-40" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs truncate">
                    {conv.title || "Untitled"}
                  </p>
                  <p className="text-[10px] text-white/20">
                    {timeAgo(conv.updated_at)}
                  </p>
                </div>
                <button
                  onClick={(e) => handleDelete(e, conv.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded text-white/20 hover:text-red-400 transition-all"
                  title="Delete"
                >
                  {deletingId === conv.id ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Trash2 className="w-3 h-3" />
                  )}
                </button>
              </button>
            );
          })
        )}
      </div>
    </motion.aside>
      )}
    </AnimatePresence>
  );
}
