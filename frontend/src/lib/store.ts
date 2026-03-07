import { create } from "zustand";
import { toast } from "sonner";
import {
  streamChatMessage,
  fetchConversations,
  fetchConversation,
  deleteConversation as apiDeleteConversation,
  renameConversation as apiRenameConversation,
  type ChatMessage,
} from "./api";
import type { ConversationSummary } from "./types";
import { useAuthStore } from "./auth-store";

interface ChatStore {
  // Current conversation
  conversationId: string | null;
  messages: ChatMessage[];
  isLoading: boolean;
  activeToolName: string | null;

  // Conversation list (for sidebar)
  conversations: ConversationSummary[];
  conversationsLoading: boolean;
  sidebarOpen: boolean;

  // Actions
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
  newConversation: () => void;
  loadConversations: () => Promise<void>;
  selectConversation: (id: string) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  renameConversation: (id: string, title: string) => Promise<void>;
  setSidebarOpen: (open: boolean) => void;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  conversationId: null,
  messages: [],
  isLoading: false,
  activeToolName: null,
  conversations: [],
  conversationsLoading: false,
  sidebarOpen: false,

  sendMessage: async (content: string) => {
    const userMessage: ChatMessage = { role: "user", content };
    const assistantMessage: ChatMessage = { role: "assistant", content: "", toolResults: [] };

    set((state) => ({
      messages: [...state.messages, userMessage, assistantMessage],
      isLoading: true,
      activeToolName: null,
    }));

    try {
      const allMessages = get().messages.slice(0, -1); // exclude placeholder
      const authState = useAuthStore.getState();
      const token = authState.isAuthenticated
        ? await authState.getValidToken()
        : null;

      await streamChatMessage(
        allMessages,
        {
          onConversationId: (id) => {
            set({ conversationId: id });
          },
          onTextDelta: (text) => {
            set((state) => {
              const msgs = [...state.messages];
              const last = { ...msgs[msgs.length - 1] };
              last.content += text;
              msgs[msgs.length - 1] = last;
              return { messages: msgs };
            });
          },
          onToolStart: (toolName) => {
            set({ activeToolName: toolName });
          },
          onToolResult: (result) => {
            set((state) => {
              const msgs = [...state.messages];
              const last = { ...msgs[msgs.length - 1] };
              last.toolResults = [...(last.toolResults ?? []), result];
              msgs[msgs.length - 1] = last;
              return { messages: msgs, activeToolName: null };
            });
          },
          onDone: () => {
            set({ isLoading: false, activeToolName: null });
            // Refresh sidebar if authenticated
            if (useAuthStore.getState().isAuthenticated) {
              get().loadConversations();
            }
          },
          onError: (message) => {
            toast.error("Chat error");
            set((state) => {
              const msgs = [...state.messages];
              const last = { ...msgs[msgs.length - 1] };
              if (!last.content) {
                last.content = message;
              }
              msgs[msgs.length - 1] = last;
              return { messages: msgs, isLoading: false, activeToolName: null };
            });
          },
        },
        {
          conversationId: get().conversationId,
          authToken: token,
        }
      );
    } catch (e) {
      const isNetwork = e instanceof TypeError && e.message === "Failed to fetch";
      const msg = isNetwork
        ? "Can't reach the server — is the backend running?"
        : "Sorry, something went wrong. Please try again.";
      toast.error(isNetwork ? "Connection failed" : "Chat error");
      set((state) => {
        const msgs = [...state.messages];
        const last = { ...msgs[msgs.length - 1] };
        last.content = msg;
        msgs[msgs.length - 1] = last;
        return { messages: msgs, isLoading: false, activeToolName: null };
      });
    }
  },

  clearMessages: () => set({ messages: [], activeToolName: null, conversationId: null }),

  newConversation: () => {
    set({ messages: [], activeToolName: null, conversationId: null });
  },

  loadConversations: async () => {
    const authState = useAuthStore.getState();
    if (!authState.isAuthenticated) return;

    const token = await authState.getValidToken();
    if (!token) return;

    set({ conversationsLoading: true });
    try {
      const convs = await fetchConversations(token);
      set({ conversations: convs });
    } catch {
      // Silent fail — sidebar just stays empty
    } finally {
      set({ conversationsLoading: false });
    }
  },

  selectConversation: async (id: string) => {
    const authState = useAuthStore.getState();
    const token = await authState.getValidToken();
    if (!token) return;

    set({ conversationId: id, isLoading: true });
    try {
      const detail = await fetchConversation(id, token);
      const messages: ChatMessage[] = detail.messages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
        toolResults: m.tool_results
          ? (m.tool_results as { toolName: string; data: unknown }[])
          : undefined,
      }));
      set({ messages, conversationId: id });
    } catch {
      toast.error("Failed to load conversation");
    } finally {
      set({ isLoading: false });
    }
  },

  deleteConversation: async (id: string) => {
    const authState = useAuthStore.getState();
    const token = await authState.getValidToken();
    if (!token) return;

    try {
      await apiDeleteConversation(id, token);
      set((state) => ({
        conversations: state.conversations.filter((c) => c.id !== id),
        // If we deleted the active conversation, clear it
        ...(state.conversationId === id
          ? { conversationId: null, messages: [] }
          : {}),
      }));
    } catch {
      toast.error("Failed to delete conversation");
    }
  },

  renameConversation: async (id: string, title: string) => {
    const authState = useAuthStore.getState();
    const token = await authState.getValidToken();
    if (!token) return;

    try {
      await apiRenameConversation(id, title, token);
      set((state) => ({
        conversations: state.conversations.map((c) =>
          c.id === id ? { ...c, title } : c
        ),
      }));
    } catch {
      toast.error("Failed to rename conversation");
    }
  },

  setSidebarOpen: (open: boolean) => set({ sidebarOpen: open }),
}));
