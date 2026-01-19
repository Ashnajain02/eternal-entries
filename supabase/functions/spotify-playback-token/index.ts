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

    // Get user from JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const token = authHeader.replace(/^Bearer\s/, "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const userId = user.id;
    console.log(`User authenticated: ${userId}`);

    if (action === "get_token") {
      // Fetch user's Spotify tokens
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("spotify_access_token, spotify_refresh_token, spotify_token_expires_at")
        .eq("id", userId)
        .single();

      if (profileError || !profile?.spotify_access_token) {
        console.log("No Spotify token found for user");
        return new Response(
          JSON.stringify({ needs_reauth: true, reason: "no_token" }),
          { headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      let accessToken: string;
      const refreshToken = profile.spotify_refresh_token;

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
          return new Response(
            JSON.stringify({ error: "Spotify credentials not configured" }),
            { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
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
            return new Response(
              JSON.stringify({ needs_reauth: true, reason: "refresh_failed" }),
              { headers: { "Content-Type": "application/json", ...corsHeaders } }
            );
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
          return new Response(
            JSON.stringify({ needs_reauth: true, reason: "refresh_error" }),
            { headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }
      } else {
        try {
          accessToken = await decryptToken(profile.spotify_access_token);
        } catch (error) {
          console.error("Error decrypting token:", error);
          return new Response(
            JSON.stringify({ needs_reauth: true, reason: "decrypt_error" }),
            { headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }
      }

      // Check if user has premium by calling Spotify API
      let isPremium = false;
      try {
        const meResponse = await fetch("https://api.spotify.com/v1/me", {
          headers: { "Authorization": `Bearer ${accessToken}` }
        });
        
        if (meResponse.ok) {
          const meData = await meResponse.json();
          isPremium = meData.product === "premium";
        }
      } catch (error) {
        console.log("Could not check premium status:", error);
      }

      return new Response(
        JSON.stringify({ 
          access_token: accessToken,
          is_premium: isPremium
        }),
        { headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error) {
    console.error("Error:", error.message);
    return new Response(
      JSON.stringify({ error: "Server error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
