
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.21.0";

// CORS headers for the function
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create a Supabase client with the provided auth token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        global: { headers: { Authorization: authHeader } },
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false,
        },
      }
    );

    // Get the authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "User not authenticated" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Parse request body
    const { code, redirect_uri, action } = await req.json();

    // Handle different actions
    if (action === "get_recent_tracks") {
      return await getRecentTracks(supabase, user.id);
    } else if (code) {
      return await exchangeCodeForToken(code, redirect_uri, supabase, user.id);
    }

    return new Response(
      JSON.stringify({ error: "Invalid request" }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error) {
    console.error("Error in Spotify Auth function:", error);
    return new Response(
      JSON.stringify({ error: "Server error", details: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});

// Exchange the authorization code for access and refresh tokens
async function exchangeCodeForToken(code: string, redirect_uri: string, supabase: any, user_id: string) {
  // Using the new client ID and secret that were provided
  const SPOTIFY_CLIENT_ID = "834fb4c11be949b2b527500c41e2cec5";
  const SPOTIFY_CLIENT_SECRET = "91843f81dc254191988e61a23993aa18";

  // Hard-coded redirect URI as requested
  const REDIRECT_URI = "https://eternal-entries.vercel.app/callback";

  try {
    // Exchange code for token
    const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": `Basic ${btoa(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`)}`,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: REDIRECT_URI,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      console.error("Spotify token error:", tokenData.error);
      return new Response(
        JSON.stringify({ error: "Failed to get Spotify token", details: tokenData.error }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get user profile from Spotify
    const profileResponse = await fetch("https://api.spotify.com/v1/me", {
      headers: {
        "Authorization": `Bearer ${tokenData.access_token}`,
      },
    });

    const profileData = await profileResponse.json();

    // Calculate token expiration time
    const expires_at = new Date();
    expires_at.setSeconds(expires_at.getSeconds() + tokenData.expires_in);

    // Store the tokens in the database
    const { error } = await supabase.rpc("update_profile_spotify_data", {
      p_user_id: user_id,
      p_access_token: tokenData.access_token,
      p_refresh_token: tokenData.refresh_token,
      p_expires_at: expires_at.toISOString(),
      p_username: profileData.id,
    });

    if (error) {
      console.error("Database error:", error);
      return new Response(
        JSON.stringify({ error: "Database error", details: error.message }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error) {
    console.error("Token exchange error:", error);
    return new Response(
      JSON.stringify({ error: "Token exchange failed", details: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
}

// Get user's recent tracks from Spotify
async function getRecentTracks(supabase: any, user_id: string) {
  try {
    // Get the access token from the database
    const { data: token, error: tokenError } = await supabase.rpc("get_user_spotify_token", {
      user_id,
    });

    if (tokenError || !token) {
      return new Response(
        JSON.stringify({ error: "No Spotify token found" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Fetch recent tracks from Spotify API
    const response = await fetch("https://api.spotify.com/v1/me/player/recently-played?limit=10", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (data.error) {
      // Handle token expired error
      if (data.error.status === 401) {
        return new Response(
          JSON.stringify({ error: "EXPIRED_TOKEN" }),
          { headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "Spotify API error", details: data.error }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Format the response
    const tracks = data.items.map((item: any) => ({
      id: item.track.id,
      name: item.track.name,
      artist: item.track.artists.map((artist: any) => artist.name).join(", "),
      album: item.track.album.name,
      albumArt: item.track.album.images[0]?.url || "",
      uri: item.track.uri,
    }));

    return new Response(
      JSON.stringify(tracks),
      { headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error) {
    console.error("Error getting recent tracks:", error);
    return new Response(
      JSON.stringify({ error: "Failed to get tracks", details: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
}
