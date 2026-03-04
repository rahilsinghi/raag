export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  toolResults?: ToolResult[];
}

export interface ToolResult {
  toolName: string;
  data: unknown;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function sendChatMessage(
  messages: ChatMessage[]
): Promise<ChatMessage> {
  const res = await fetch(`${API_URL}/api/chat/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });
  if (!res.ok) throw new Error(`Chat API error: ${res.status}`);
  return res.json();
}
