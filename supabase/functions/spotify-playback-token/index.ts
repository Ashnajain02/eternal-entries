import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.21.0";
import { encryptToken, decryptToken } from "../_shared/spotify-crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  console.log("Spotify Playback Token - Request received");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData = await req.json();
    const { action } = requestData;
    console.log(`Action requested: ${action}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(supabaseUrl ?? "", supabaseKey ?? "");

    // Validate JWT from Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return errorResponse("Unauthorized", 401);
    }

    const token = authHeader.replace(/^Bearer\s/, "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return errorResponse("Unauthorized", 401);
    }

    const userId = user.id;
    console.log(`User authenticated: ${userId}`);

    if (action === "get_token") {
      return await getToken(supabase, userId);
    }

    if (action === "is_connected") {
      return await isConnected(supabase, userId);
    }

    return errorResponse("Invalid action", 400);
  } catch (error) {
    console.error("Error:", error.message);
    return errorResponse("Server error", 500);
  }
});

function errorResponse(message: string, status: number) {
  return new Response(
    JSON.stringify({ error: message }),
    { status, headers: { "Content-Type": "application/json", ...corsHeaders } }
  );
}

function successResponse(data: object) {
  return new Response(
    JSON.stringify(data),
    { headers: { "Content-Type": "application/json", ...corsHeaders } }
  );
}

// Check if user has a valid (non-expired) Spotify connection
async function isConnected(supabase: any, userId: string) {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("spotify_access_token, spotify_token_expires_at")
    .eq("id", userId)
    .single();

  if (error || !profile?.spotify_access_token) {
    return successResponse({ connected: false });
  }

  // Check if token is expired
  const expiresAt = profile.spotify_token_expires_at 
    ? new Date(profile.spotify_token_expires_at)
    : new Date(0);
  
  // If expired, we can still refresh, so consider connected
  // Only "not connected" if no tokens at all
  return successResponse({ connected: true });
}

// Get a valid access token, refreshing if needed
async function getToken(supabase: any, userId: string) {
  // Fetch user's Spotify tokens and premium status from DB
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("spotify_access_token, spotify_refresh_token, spotify_token_expires_at, spotify_is_premium")
    .eq("id", userId)
    .single();

  if (profileError || !profile?.spotify_access_token) {
    console.log("No Spotify token found for user");
    return successResponse({ needs_reauth: true, reason: "no_token" });
  }

  let accessToken: string;
  const refreshToken = profile.spotify_refresh_token;
  const isPremium = profile.spotify_is_premium;

  // Check if token is expired
  const expiresAt = profile.spotify_token_expires_at 
    ? new Date(profile.spotify_token_expires_at)
    : new Date(0);
  
  const isExpired = expiresAt < new Date();

  if (isExpired && refreshToken) {
    console.log("Token expired, refreshing...");
    
    const SPOTIFY_CLIENT_ID = Deno.env.get("SPOTIFY_CLIENT_ID");
    const SPOTIFY_CLIENT_SECRET = Deno.env.get("SPOTIFY_CLIENT_SECRET");

    if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
      return errorResponse("Spotify credentials not configured", 500);
    }

    try {
      const decryptedRefreshToken = await decryptToken(refreshToken);
      
      const refreshResponse = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Authorization": `Basic ${btoa(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`)}`,
        },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: decryptedRefreshToken,
        }),
      });

      const refreshData = await refreshResponse.json();

      if (refreshData.error) {
        console.error("Token refresh failed:", refreshData.error);
        return successResponse({ needs_reauth: true, reason: "refresh_failed" });
      }

      accessToken = refreshData.access_token;

      // Update stored tokens
      const newExpiresAt = new Date();
      newExpiresAt.setSeconds(newExpiresAt.getSeconds() + refreshData.expires_in);
      
      const encryptedAccessToken = await encryptToken(accessToken);
      const encryptedRefreshToken = refreshData.refresh_token 
        ? await encryptToken(refreshData.refresh_token)
        : refreshToken;

      await supabase
        .from("profiles")
        .update({
          spotify_access_token: encryptedAccessToken,
          spotify_refresh_token: encryptedRefreshToken,
          spotify_token_expires_at: newExpiresAt.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq("id", userId);

      console.log("Token refreshed successfully");
    } catch (error) {
      console.error("Error refreshing token:", error);
      return successResponse({ needs_reauth: true, reason: "refresh_error" });
    }
  } else {
    try {
      accessToken = await decryptToken(profile.spotify_access_token);
    } catch (error) {
      console.error("Error decrypting token:", error);
      return successResponse({ needs_reauth: true, reason: "decrypt_error" });
    }
  }

  // Return token and premium status (stored at connection time, no extra API call)
  return successResponse({ 
    access_token: accessToken,
    is_premium: isPremium ?? false
  });
}
