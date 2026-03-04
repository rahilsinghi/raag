import { create } from "zustand";
import { toast } from "sonner";
import { sendChatMessage, type ChatMessage } from "./api";

interface ChatStore {
  messages: ChatMessage[];
  isLoading: boolean;
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  messages: [],
  isLoading: false,
  sendMessage: async (content: string) => {
    const userMessage: ChatMessage = { role: "user", content };
    set((state) => ({
      messages: [...state.messages, userMessage],
      isLoading: true,
    }));
    try {
      const allMessages = [...get().messages];
      const response = await sendChatMessage(allMessages);
      set((state) => ({
        messages: [...state.messages, response],
        isLoading: false,
      }));
    } catch (e) {
      const isNetwork = e instanceof TypeError && e.message === "Failed to fetch";
      const msg = isNetwork
        ? "Can't reach the server — is the backend running?"
        : "Sorry, something went wrong. Please try again.";
      toast.error(isNetwork ? "Connection failed" : "Chat error");
      set((state) => ({
        messages: [
          ...state.messages,
          { role: "assistant" as const, content: msg },
        ],
        isLoading: false,
      }));
    }
  },
  clearMessages: () => set({ messages: [] }),
}));
