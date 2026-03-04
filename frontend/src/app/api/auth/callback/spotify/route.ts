import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const error = req.nextUrl.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(new URL("/?spotify_error=" + error, req.url));
  }

  if (!code) {
    return NextResponse.redirect(
      new URL("/?spotify_error=no_code", req.url)
    );
  }

  // Exchange code for tokens server-side (no PKCE verifier needed)
  try {
    const resp = await fetch(`${API_URL}/api/spotify/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });

    if (!resp.ok) {
      const detail = await resp.text();
      console.error("Spotify token exchange failed:", detail);
      return NextResponse.redirect(
        new URL("/?spotify_error=token_exchange_failed", req.url)
      );
    }

    const data = await resp.json();

    // Pass tokens to frontend via URL fragment (not query params, for security)
    const params = new URLSearchParams({
      spotify_access: data.access_token,
      spotify_refresh: data.refresh_token,
      spotify_expires: String(data.expires_in),
    });

    return NextResponse.redirect(
      new URL("/?spotify_auth=1#" + params.toString(), req.url)
    );
  } catch (e) {
    console.error("Spotify callback error:", e);
    return NextResponse.redirect(
      new URL("/?spotify_error=server_error", req.url)
    );
  }
}
