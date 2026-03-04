import { create } from "zustand";
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
    } catch {
      set((state) => ({
        messages: [
          ...state.messages,
          {
            role: "assistant" as const,
            content: "Sorry, something went wrong. Please try again.",
          },
        ],
        isLoading: false,
      }));
    }
  },
  clearMessages: () => set({ messages: [] }),
}));
