import type { ConversationSummary, ConversationDetail } from "./types";

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

// ---------- Auth ----------

interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

interface AuthUser {
  id: string;
  email: string;
  display_name: string | null;
  created_at: string;
}

export async function registerUser(
  email: string,
  password: string,
  displayName?: string
): Promise<AuthTokens> {
  const res = await fetch(`${API_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, display_name: displayName }),
  });
  if (res.status === 409) throw new Error("Email already registered");
  if (!res.ok) throw new Error("Registration failed");
  return res.json();
}

export async function loginUser(
  email: string,
  password: string
): Promise<AuthTokens> {
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (res.status === 401) throw new Error("Invalid email or password");
  if (!res.ok) throw new Error("Login failed");
  return res.json();
}

export async function fetchCurrentUser(token: string): Promise<AuthUser> {
  const res = await fetch(`${API_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch user");
  return res.json();
}

export async function refreshAuthToken(
  refreshToken: string
): Promise<AuthTokens> {
  const res = await fetch(`${API_URL}/api/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  if (!res.ok) throw new Error("Token refresh failed");
  return res.json();
}

export async function sendChatMessage(
  messages: ChatMessage[],
  conversationId?: string | null
): Promise<ChatMessage> {
  const res = await fetch(`${API_URL}/api/chat/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, conversation_id: conversationId }),
  });
  if (!res.ok) throw new Error(`Chat API error: ${res.status}`);
  return res.json();
}

export interface StreamCallbacks {
  onTextDelta: (text: string) => void;
  onToolStart: (toolName: string) => void;
  onToolResult: (result: ToolResult) => void;
  onDone: () => void;
  onError: (message: string) => void;
  onConversationId?: (id: string) => void;
}

export async function streamChatMessage(
  messages: ChatMessage[],
  callbacks: StreamCallbacks,
  options?: { conversationId?: string | null; authToken?: string | null }
): Promise<void> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (options?.authToken) {
    headers["Authorization"] = `Bearer ${options.authToken}`;
  }

  const res = await fetch(`${API_URL}/api/chat/stream`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      messages,
      conversation_id: options?.conversationId,
    }),
  });

  if (!res.ok) {
    callbacks.onError(`Chat API error: ${res.status}`);
    return;
  }

  const reader = res.body?.getReader();
  if (!reader) {
    callbacks.onError("No response body");
    return;
  }

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const raw = line.slice(6).trim();
      if (!raw) continue;

      try {
        const event = JSON.parse(raw);
        switch (event.type) {
          case "conversation_id":
            callbacks.onConversationId?.(event.id);
            break;
          case "text_delta":
            callbacks.onTextDelta(event.content);
            break;
          case "tool_start":
            callbacks.onToolStart(event.toolName);
            break;
          case "tool_result":
            callbacks.onToolResult({
              toolName: event.toolName,
              data: event.data,
            });
            break;
          case "done":
            callbacks.onDone();
            return;
          case "error":
            callbacks.onError(event.message);
            return;
        }
      } catch {
        // skip malformed SSE lines
      }
    }
  }

  callbacks.onDone();
}

// ---------- Conversations ----------

export async function fetchConversations(
  token: string
): Promise<ConversationSummary[]> {
  const res = await fetch(`${API_URL}/api/conversations/`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Conversations error: ${res.status}`);
  return res.json();
}

export async function fetchConversation(
  id: string,
  token: string
): Promise<ConversationDetail> {
  const res = await fetch(`${API_URL}/api/conversations/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Conversation error: ${res.status}`);
  return res.json();
}

export async function renameConversation(
  id: string,
  title: string,
  token: string
): Promise<void> {
  const res = await fetch(`${API_URL}/api/conversations/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ title }),
  });
  if (!res.ok) throw new Error(`Rename error: ${res.status}`);
}

export async function deleteConversation(
  id: string,
  token: string
): Promise<void> {
  const res = await fetch(`${API_URL}/api/conversations/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Delete error: ${res.status}`);
}

// ---------- Songs ----------

export async function describeBar(barId: string) {
  const res = await fetch(`${API_URL}/api/songs/bars/${barId}/describe`, {
    method: "POST",
  });
  if (!res.ok) throw new Error(`Describe bar API error: ${res.status}`);
  return res.json();
}

export async function fetchGraphData(params?: {
  view_mode?: string;
  album_id?: string;
  mc?: string;
}) {
  const sp = new URLSearchParams();
  if (params?.view_mode) sp.set("view_mode", params.view_mode);
  if (params?.album_id) sp.set("album_id", params.album_id);
  if (params?.mc) sp.set("mc", params.mc);
  const res = await fetch(`${API_URL}/api/graph/data?${sp.toString()}`);
  if (!res.ok) throw new Error(`Graph API error: ${res.status}`);
  return res.json();
}

export async function refreshGraphData() {
  const res = await fetch(`${API_URL}/api/graph/refresh`, { method: "POST" });
  if (!res.ok) throw new Error(`Graph refresh error: ${res.status}`);
  return res.json();
}

// --- Spotify ---

export async function getSpotifyAuthUrl(): Promise<{ url: string }> {
  const res = await fetch(`${API_URL}/api/spotify/auth-url`);
  if (!res.ok) throw new Error(`Spotify auth URL error: ${res.status}`);
  return res.json();
}

export async function refreshSpotifyToken(
  refreshToken: string
): Promise<{ access_token: string; refresh_token: string; expires_in: number }> {
  const res = await fetch(`${API_URL}/api/spotify/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  if (!res.ok) throw new Error(`Spotify refresh error: ${res.status}`);
  return res.json();
}

export async function matchAllSongsToSpotify(
  accessToken: string
): Promise<
  {
    song_id: string;
    song_title: string;
    spotify_track: unknown;
    matched: boolean;
  }[]
> {
  const res = await fetch(
    `${API_URL}/api/spotify/match-all?access_token=${encodeURIComponent(accessToken)}`,
    { method: "POST" }
  );
  if (!res.ok) throw new Error(`Spotify match error: ${res.status}`);
  return res.json();
}

export async function getSongSpotifyInfo(songId: string) {
  const res = await fetch(`${API_URL}/api/spotify/track/${songId}`);
  if (!res.ok) throw new Error(`Spotify track error: ${res.status}`);
  return res.json();
}

// --- Song detail + timing ---

export async function fetchSongDetail(songId: string) {
  const res = await fetch(`${API_URL}/api/songs/${songId}`);
  if (!res.ok) throw new Error(`Song detail error: ${res.status}`);
  return res.json();
}

export async function fetchSongTiming(
  songId: string,
  source: "estimated" | "synced" = "estimated"
) {
  const res = await fetch(
    `${API_URL}/api/songs/${songId}/timing?source=${source}`
  );
  if (!res.ok) throw new Error(`Timing error: ${res.status}`);
  return res.json();
}

export async function computeSongTiming(songId: string) {
  const res = await fetch(`${API_URL}/api/songs/${songId}/compute-timing`, {
    method: "POST",
  });
  if (!res.ok) throw new Error(`Compute timing error: ${res.status}`);
  return res.json();
}
