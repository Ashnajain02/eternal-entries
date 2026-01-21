import { createClient } from "https://esm.sh/@supabase/supabase-js@2.21.0";
import { encryptToken, decryptToken } from "./spotify-crypto.ts";

export interface TokenResult {
  success: boolean;
  accessToken?: string;
  error?: string;
  isPremium?: boolean;
}

export interface CredentialsData {
  access_token: string;
  refresh_token: string;
  token_expires_at: string;
}

/**
 * Get a valid Spotify access token for a user, refreshing if needed.
 * Tokens are stored in the secure spotify_credentials table (service role only).
 * This is the single source of truth for token retrieval and refresh.
 */
export async function getValidSpotifyToken(
  userId: string,
  supabase: ReturnType<typeof createClient>
): Promise<TokenResult> {
  // Get the user's Spotify credentials from the SECURE table (service role access only)
  const { data: credentialsData, error: credentialsError } = await supabase
    .from("spotify_credentials")
    .select("access_token, refresh_token, token_expires_at")
    .eq("user_id", userId)
    .single();

  // Also get premium status from profiles (non-sensitive data)
  const { data: profileData } = await supabase
    .from("profiles")
    .select("spotify_is_premium")
    .eq("id", userId)
    .single();

  if (credentialsError || !credentialsData) {
    console.log("No Spotify credentials found for user");
    return { success: false, error: "Spotify not connected" };
  }

  const { access_token, refresh_token, token_expires_at } = credentialsData as CredentialsData;

  if (!access_token || !refresh_token) {
    return { success: false, error: "Spotify not connected" };
  }

  // Decrypt the tokens
  let accessToken: string;
  let refreshToken: string;
  
  try {
    accessToken = await decryptToken(access_token);
    refreshToken = await decryptToken(refresh_token);
  } catch (error) {
    console.error("Error decrypting tokens:", error);
    return { success: false, error: "Failed to decrypt tokens" };
  }

  // Check if token is expired
  const now = new Date();
  const expiresAt = token_expires_at ? new Date(token_expires_at) : new Date(0);

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

    // Update token in the SECURE credentials table
    const newExpiresAt = new Date();
    newExpiresAt.setSeconds(newExpiresAt.getSeconds() + refreshData.expires_in);

    const encryptedNewToken = await encryptToken(refreshData.access_token);

    // Use the secure update function
    const { error: updateError } = await supabase.rpc("update_spotify_credentials", {
      p_user_id: userId,
      p_access_token: encryptedNewToken,
      p_refresh_token: access_token, // Keep existing refresh token (encrypted)
      p_expires_at: newExpiresAt.toISOString()
    });

    if (updateError) {
      console.error("Error updating tokens:", updateError);
      // Continue anyway - the token is still valid for this request
    }

    accessToken = refreshData.access_token;
  }

  return { 
    success: true, 
    accessToken,
    isPremium: profileData?.spotify_is_premium ?? undefined
  };
}

/**
 * Check if user has Spotify credentials stored
 */
export async function hasSpotifyCredentials(
  userId: string,
  supabase: ReturnType<typeof createClient>
): Promise<boolean> {
  const { data, error } = await supabase
    .from("spotify_credentials")
    .select("user_id")
    .eq("user_id", userId)
    .single();

  return !error && !!data;
}