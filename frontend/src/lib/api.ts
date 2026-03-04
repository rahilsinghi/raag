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
