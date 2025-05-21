
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.21.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    
    // Parse request body
    const requestData = await req.json();
    const { action, code, redirect_uri } = requestData;
    
    // Create a Supabase client with the authorization header if it exists
    const authHeader = req.headers.get("Authorization");
    const supabase = createClient(
      supabaseUrl,
      authHeader ? supabaseServiceRoleKey : supabaseAnonKey,
      {
        global: { 
          headers: authHeader ? { Authorization: authHeader } : {} 
        },
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false,
        },
      }
    );
    
    // Get authenticated user if authorization header exists
    let userId = null;
    if (authHeader) {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (user && !userError) {
        userId = user.id;
      }
    }
    
    // For actions that require authentication, verify the user
    if (action === "is_token_expired" || action === "revoke") {
      if (!userId) {
        return new Response(
          JSON.stringify({ error: "Authentication required" }),
          { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      
      if (action === "is_token_expired") {
        return await isTokenExpired(supabase, userId);
      } else if (action === "revoke") {
        return await revokeAccess(supabase, userId);
      }
    } else if (action === "authorize") {
      return await getAuthorizationUrl(redirect_uri);
    } else if (action === "callback" && code) {
      if (!userId) {
        return new Response(
          JSON.stringify({ error: "Authentication required for callback" }),
          { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      return await handleCallback(code, redirect_uri, supabase, userId);
    } else {
      return new Response(
        JSON.stringify({ error: "Invalid request" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
  } catch (error) {
    console.error("Error in Spotify Auth function:", error);
    return new Response(
      JSON.stringify({ error: "Server error", details: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});

// Check if the token is expired
async function isTokenExpired(supabase, userId) {
  try {
    const { data, error } = await supabase.rpc("is_spotify_token_expired", { user_id: userId });
    
    if (error) {
      console.error("Error checking token expiration:", error);
      return new Response(
        JSON.stringify({ error: "Failed to check token expiration", details: error.message }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

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
async function getAuthorizationUrl(redirect_uri) {
  try {
    const SPOTIFY_CLIENT_ID = Deno.env.get("SPOTIFY_CLIENT_ID");

    if (!SPOTIFY_CLIENT_ID) {
      return new Response(
        JSON.stringify({ error: "Missing Spotify client ID" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const state = Math.random().toString(36).substring(2, 15);
    const scopes = [
      'user-read-private',
      'user-read-email',
      'user-top-read',
      'user-read-recently-played'
    ];
    
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

// Handle the callback from Spotify
async function handleCallback(code, redirect_uri, supabase, userId) {
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
        redirect_uri,
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
      p_user_id: userId,
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
        display_name: profileData.display_name
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
async function revokeAccess(supabase, userId) {
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
      .eq("id", userId);
    
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
