import { create } from "zustand";
import { toast } from "sonner";
import { streamChatMessage, type ChatMessage } from "./api";

interface ChatStore {
  messages: ChatMessage[];
  isLoading: boolean;
  activeToolName: string | null;
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  messages: [],
  isLoading: false,
  activeToolName: null,
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

      await streamChatMessage(allMessages, {
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
      });
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
  clearMessages: () => set({ messages: [], activeToolName: null }),
}));
