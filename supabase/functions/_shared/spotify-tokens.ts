import { createClient } from "https://esm.sh/@supabase/supabase-js@2.21.0";
import { encryptToken, decryptToken } from "./spotify-crypto.ts";

export interface TokenResult {
  success: boolean;
  accessToken?: string;
  error?: string;
  isPremium?: boolean;
}

export interface UserTokenData {
  spotify_access_token: string | null;
  spotify_refresh_token: string | null;
  spotify_token_expires_at: string | null;
  spotify_is_premium: boolean | null;
}

/**
 * Get a valid Spotify access token for a user, refreshing if needed.
 * This is the single source of truth for token retrieval and refresh.
 */
export async function getValidSpotifyToken(
  userId: string,
  supabase: ReturnType<typeof createClient>
): Promise<TokenResult> {
  // Get the user's Spotify token data
  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .select("spotify_access_token, spotify_refresh_token, spotify_token_expires_at, spotify_is_premium")
    .eq("id", userId)
    .single();

  if (profileError || !profileData) {
    console.error("Error getting user profile:", profileError);
    return { success: false, error: "Failed to retrieve user profile" };
  }

  const { spotify_access_token, spotify_refresh_token, spotify_token_expires_at, spotify_is_premium } = profileData as UserTokenData;

  if (!spotify_access_token || !spotify_refresh_token) {
    return { success: false, error: "Spotify not connected" };
  }

  // Decrypt the tokens
  let accessToken: string;
  let refreshToken: string;
  
  try {
    accessToken = await decryptToken(spotify_access_token);
    refreshToken = await decryptToken(spotify_refresh_token);
  } catch (error) {
    console.error("Error decrypting tokens:", error);
    return { success: false, error: "Failed to decrypt tokens" };
  }

  // Check if token is expired
  const now = new Date();
  const expiresAt = spotify_token_expires_at ? new Date(spotify_token_expires_at) : new Date(0);

  if (now >= expiresAt) {
    console.log("Token expired, refreshing...");
    
    const SPOTIFY_CLIENT_ID = Deno.env.get("SPOTIFY_CLIENT_ID");
    const SPOTIFY_CLIENT_SECRET = Deno.env.get("SPOTIFY_CLIENT_SECRET");

    if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
      console.error("Missing Spotify credentials");
      return { success: false, error: "Server configuration error" };
    }

    // Refresh the token
    const refreshResponse = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": `Basic ${btoa(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`)}`
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken
      })
    });

    const refreshData = await refreshResponse.json();

    if (refreshData.error) {
      console.error("Error refreshing token:", refreshData.error);
      return { success: false, error: "Failed to refresh Spotify token" };
    }

    // Update token in database
    const newExpiresAt = new Date();
    newExpiresAt.setSeconds(newExpiresAt.getSeconds() + refreshData.expires_in);

    const encryptedNewToken = await encryptToken(refreshData.access_token);

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        spotify_access_token: encryptedNewToken,
        spotify_token_expires_at: newExpiresAt.toISOString()
      })
      .eq("id", userId);

    if (updateError) {
      console.error("Error updating tokens:", updateError);
      // Continue anyway - the token is still valid for this request
    }

    accessToken = refreshData.access_token;
  }

  return { 
    success: true, 
    accessToken,
    isPremium: spotify_is_premium ?? undefined
  };
}
