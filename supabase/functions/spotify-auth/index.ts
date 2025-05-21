
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
    const requestData = await req.json();
    const { action, code, redirect_uri } = requestData;

    // Handle different actions
    if (action === "get_recent_tracks") {
      return await getRecentTracks(supabase, user.id);
    } else if (action === "is_token_expired") {
      return await isTokenExpired(supabase, user.id);
    } else if (action === "authorize") {
      return await getAuthorizationUrl(supabase, user.id, redirect_uri);
    } else if (action === "callback" && code) {
      return await handleCallback(code, redirect_uri, supabase, user.id);
    } else if (action === "revoke") {
      return await revokeAccess(supabase, user.id);
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

// Check if the Spotify token is expired
async function isTokenExpired(supabase: any, user_id: string) {
  try {
    console.log(`Checking token expiration for user: ${user_id}`);
    
    // Call the RPC function to check if the token is expired
    const { data, error } = await supabase.rpc("is_spotify_token_expired", {
      user_id,
    });

    if (error) {
      console.error("Error checking token expiration:", error);
      return new Response(
        JSON.stringify({ error: "Failed to check token expiration", details: error.message }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Return whether the token is expired
    return new Response(
      JSON.stringify({ expired: data }),
      { headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error) {
    console.error("Error checking token expiration:", error);
    return new Response(
      JSON.stringify({ error: "Failed to check token expiration", details: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
}

// Get Spotify authorization URL
async function getAuthorizationUrl(supabase: any, user_id: string, redirect_uri: string) {
  try {
    const SPOTIFY_CLIENT_ID = Deno.env.get("SPOTIFY_CLIENT_ID");

    if (!SPOTIFY_CLIENT_ID) {
      return new Response(
        JSON.stringify({ error: "Missing Spotify client ID" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Generate a random state value for security
    const state = Math.random().toString(36).substring(2, 15);
    
    // Required scopes for Spotify API
    const scopes = [
      'user-read-private',
      'user-read-email',
      'user-top-read',
      'user-read-recently-played'
    ];
    
    // Create the authorization URL
    const params = new URLSearchParams({
      client_id: SPOTIFY_CLIENT_ID,
      response_type: 'code',
      redirect_uri: redirect_uri,
      scope: scopes.join(' '),
      state: state,
      show_dialog: 'true'
    });
    
    const authUrl = `https://accounts.spotify.com/authorize?${params.toString()}`;
    
    return new Response(
      JSON.stringify({ url: authUrl }),
      { headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error) {
    console.error("Error generating authorization URL:", error);
    return new Response(
      JSON.stringify({ error: "Failed to generate authorization URL", details: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
}

// Handle the OAuth callback
async function handleCallback(code: string, redirect_uri: string, supabase: any, user_id: string) {
  console.log("redirect_uri: ", redirect_uri)
  try {
    const SPOTIFY_CLIENT_ID = Deno.env.get("SPOTIFY_CLIENT_ID");
    const SPOTIFY_CLIENT_SECRET = Deno.env.get("SPOTIFY_CLIENT_SECRET");
    
    if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
      return new Response(
        JSON.stringify({ error: "Missing Spotify credentials" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    
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
        redirect_uri: redirect_uri,
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
      JSON.stringify({ 
        success: true,
        display_name: profileData.display_name,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: expires_at.toISOString()
      }),
      { headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error) {
    console.error("Callback error:", error);
    return new Response(
      JSON.stringify({ error: "Callback failed", details: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
}

// Revoke Spotify access
async function revokeAccess(supabase: any, user_id: string) {
  try {
    // Update the profile to remove Spotify data
    const { error } = await supabase
      .from("profiles")
      .update({
        spotify_access_token: null,
        spotify_refresh_token: null,
        spotify_token_expires_at: null,
        spotify_username: null,
        updated_at: new Date().toISOString()
      })
      .eq("id", user_id);
    
    if (error) {
      console.error("Error revoking access:", error);
      return new Response(
        JSON.stringify({ error: "Failed to revoke access", details: error.message }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    
    return new Response(
      JSON.stringify({ success: true }),
      { headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error) {
    console.error("Error revoking access:", error);
    return new Response(
      JSON.stringify({ error: "Failed to revoke access", details: error.message }),
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
