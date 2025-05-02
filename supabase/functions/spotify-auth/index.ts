import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
const clientId = Deno.env.get("SPOTIFY_CLIENT_ID") || "";
const clientSecret = Deno.env.get("SPOTIFY_CLIENT_SECRET") || "";

console.log("Environment check on startup:");
console.log("SUPABASE_URL available:", !!supabaseUrl);
console.log("SUPABASE_ANON_KEY available:", !!supabaseAnonKey);
console.log("SPOTIFY_CLIENT_ID available:", !!clientId);
console.log("SPOTIFY_CLIENT_SECRET available:", !!clientSecret);

// Create a Supabase client for the function
const supabase = createClient(supabaseUrl, supabaseAnonKey);

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }
  
  try {
    // Parse the request URL
    const url = new URL(req.url);
    const path = url.pathname.split("/").pop();
    
    console.log(`Request to ${path} endpoint`);
    
    // New authorize endpoint that will provide the proper authorization URL
    if (path === "authorize") {
      // Get the authorization header from the request
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(
          JSON.stringify({ error: "No authorization header" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
        );
      }
      
      // Get redirect_uri and scope from query params
      const redirect_uri = url.searchParams.get("redirect_uri");
      const scope = url.searchParams.get("scope");
      const show_dialog = url.searchParams.get("show_dialog") === "true";
      
      console.log("Auth request params:", { redirect_uri, scope, show_dialog });
      
      if (!redirect_uri || !scope) {
        return new Response(
          JSON.stringify({ error: "Missing required parameters" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }
      
      if (!clientId) {
        return new Response(
          JSON.stringify({ error: "Spotify Client ID is not configured" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
        );
      }
      
      // Generate the authorization URL with the proper client ID
      // Important: Ensure clientId is not a timestamp or other unexpected value
      console.log("Client ID type:", typeof clientId);
      console.log("Client ID length:", clientId.length);
      console.log("First 5 chars of Client ID:", clientId.substring(0, 5));
      
      const authUrl = `https://accounts.spotify.com/authorize?client_id=${encodeURIComponent(clientId)}&response_type=code&redirect_uri=${encodeURIComponent(
        redirect_uri
      )}&scope=${encodeURIComponent(scope)}${show_dialog ? "&show_dialog=true" : ""}`;
      
      console.log("Generated auth URL:", authUrl);
      
      return new Response(
        JSON.stringify({ url: authUrl }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Get the authorization header from the request for other endpoints
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }
    
    const token = authHeader.replace("Bearer ", "");
    
    // Verify the JWT token
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }
    
    if (path === "callback") {
      // Handle the OAuth callback from Spotify
      const code = url.searchParams.get("code");
      
      if (!code) {
        return new Response(
          JSON.stringify({ error: "No authorization code provided" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }
      
      // Extract origin from the request headers or default to URL origin
      const originUrl = new URL(req.headers.get("Origin") || url.origin);
      const redirectUri = `${originUrl.origin}/spotify-callback`;
      
      console.log("Using redirect URI for token exchange:", redirectUri);
      console.log("Client credentials:", { 
        clientIdLength: clientId.length,
        clientSecretLength: clientSecret ? clientSecret.length : 0
      });
      
      // Exchange the code for an access token
      const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Authorization": `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: redirectUri,
        }),
      });
      
      const tokenData = await tokenResponse.json();
      
      if (tokenData.error) {
        console.error("Token exchange error:", tokenData.error);
        console.error("Token exchange error description:", tokenData.error_description);
        return new Response(
          JSON.stringify({ error: tokenData.error, error_description: tokenData.error_description }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }
      
      // Get the user's Spotify profile
      const profileResponse = await fetch("https://api.spotify.com/v1/me", {
        headers: {
          "Authorization": `Bearer ${tokenData.access_token}`,
        },
      });
      
      const profileData = await profileResponse.json();
      
      // Calculate token expiration
      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + tokenData.expires_in);
      
      // Save the tokens in the user's profile
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          spotify_access_token: tokenData.access_token,
          spotify_refresh_token: tokenData.refresh_token,
          spotify_token_expires_at: expiresAt.toISOString(),
          spotify_username: profileData.display_name || profileData.id,
        })
        .eq("id", user.id);
      
      if (updateError) {
        console.error("Error updating profile:", updateError);
        return new Response(
          JSON.stringify({ error: "Failed to save Spotify credentials" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          success: true,
          display_name: profileData.display_name,
          expires_at: expiresAt.toISOString() 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else if (path === "refresh") {
      // Get the user's refresh token
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("spotify_refresh_token")
        .eq("id", user.id)
        .single();
      
      if (profileError || !profile.spotify_refresh_token) {
        return new Response(
          JSON.stringify({ error: "No refresh token found" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }
      
      // Refresh the access token
      const refreshResponse = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Authorization": `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
        },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: profile.spotify_refresh_token,
        }),
      });
      
      const refreshData = await refreshResponse.json();
      
      if (refreshData.error) {
        return new Response(
          JSON.stringify({ error: refreshData.error }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }
      
      // Calculate new expiration time
      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + refreshData.expires_in);
      
      // Update the tokens in the database
      const updateData: any = {
        spotify_access_token: refreshData.access_token,
        spotify_token_expires_at: expiresAt.toISOString(),
      };
      
      // Update refresh token if provided
      if (refreshData.refresh_token) {
        updateData.spotify_refresh_token = refreshData.refresh_token;
      }
      
      const { error: updateError } = await supabase
        .from("profiles")
        .update(updateData)
        .eq("id", user.id);
      
      if (updateError) {
        return new Response(
          JSON.stringify({ error: "Failed to update tokens" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          access_token: refreshData.access_token,
          expires_at: expiresAt.toISOString() 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else if (path === "revoke") {
      // Revoke the Spotify access
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          spotify_access_token: null,
          spotify_refresh_token: null,
          spotify_token_expires_at: null,
          spotify_username: null,
        })
        .eq("id", user.id);
      
      if (updateError) {
        return new Response(
          JSON.stringify({ error: "Failed to revoke Spotify access" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
        );
      }
      
      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else if (path === "search") {
      // Get user's Spotify token
      const { data, error: profileError } = await supabase
        .from("profiles")
        .select("spotify_access_token, spotify_token_expires_at")
        .eq("id", user.id)
        .single();
      
      if (profileError || !data.spotify_access_token) {
        return new Response(
          JSON.stringify({ error: "Not connected to Spotify" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }
      
      // Check if token is expired
      const isExpired = new Date(data.spotify_token_expires_at) < new Date();
      
      if (isExpired) {
        return new Response(
          JSON.stringify({ error: "Token expired, please refresh" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
        );
      }
      
      // Get query parameters
      const query = url.searchParams.get("q") || "";
      
      if (!query) {
        return new Response(
          JSON.stringify({ error: "No search query provided" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }
      
      // Search Spotify
      const searchResponse = await fetch(
        `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=10`,
        {
          headers: {
            "Authorization": `Bearer ${data.spotify_access_token}`,
          },
        }
      );
      
      const searchData = await searchResponse.json();
      
      if (searchData.error) {
        // If we get an auth error, the token might be invalid despite not being expired
        if (searchData.error.status === 401) {
          // Attempt to refresh the token
          try {
            // Try to refresh the token and perform the search again
            const refreshResult = await refreshAndRetrySearch(user.id, query);
            return new Response(
              JSON.stringify({ tracks: refreshResult }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          } catch (refreshError) {
            return new Response(
              JSON.stringify({ error: "Authentication failed, please reconnect to Spotify" }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
            );
          }
        }
        
        return new Response(
          JSON.stringify({ error: searchData.error.message }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: searchData.error.status || 400 }
        );
      }
      
      // Transform the response to match our app's format
      const tracks = searchData.tracks.items.map((track: any) => ({
        id: track.id,
        name: track.name,
        artist: track.artists.map((a: any) => a.name).join(", "),
        album: track.album.name,
        albumArt: track.album.images[0]?.url || "",
        uri: track.uri,
      }));
      
      return new Response(
        JSON.stringify({ tracks }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else if (path === "status") {
      // Get the user's Spotify connection status
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("spotify_username, spotify_token_expires_at")
        .eq("id", user.id)
        .single();
      
      if (profileError) {
        return new Response(
          JSON.stringify({ error: "Failed to get profile" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
        );
      }
      
      const isConnected = !!profile.spotify_username;
      const isExpired = !profile.spotify_token_expires_at || new Date(profile.spotify_token_expires_at) < new Date();
      
      return new Response(
        JSON.stringify({
          connected: isConnected,
          expired: isConnected && isExpired,
          username: profile.spotify_username || null,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      return new Response(
        JSON.stringify({ error: "Invalid endpoint" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }
  } catch (error) {
    console.error("Error:", error.message);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

// Helper function to refresh token and retry search
async function refreshAndRetrySearch(userId: string, query: string): Promise<any[]> {
  // Get refresh token
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("spotify_refresh_token")
    .eq("id", userId)
    .single();
  
  if (profileError || !profile.spotify_refresh_token) {
    throw new Error("No refresh token available");
  }
  
  // Refresh the access token
  const refreshResponse = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Authorization": `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: profile.spotify_refresh_token,
    }),
  });
  
  const refreshData = await refreshResponse.json();
  
  if (refreshData.error) {
    throw new Error(refreshData.error);
  }
  
  // Calculate new expiration time
  const expiresAt = new Date();
  expiresAt.setSeconds(expiresAt.getSeconds() + refreshData.expires_in);
  
  // Update tokens in database
  const updateData: any = {
    spotify_access_token: refreshData.access_token,
    spotify_token_expires_at: expiresAt.toISOString(),
  };
  
  if (refreshData.refresh_token) {
    updateData.spotify_refresh_token = refreshData.refresh_token;
  }
  
  const { error: updateError } = await supabase
    .from("profiles")
    .update(updateData)
    .eq("id", userId);
  
  if (updateError) {
    throw new Error("Failed to update tokens");
  }
  
  // Try the search again with the new token
  const searchResponse = await fetch(
    `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=10`,
    {
      headers: {
        "Authorization": `Bearer ${refreshData.access_token}`,
      },
    }
  );
  
  const searchData = await searchResponse.json();
  
  if (searchData.error) {
    throw new Error(searchData.error.message);
  }
  
  // Transform the response
  return searchData.tracks.items.map((track: any) => ({
    id: track.id,
    name: track.name,
    artist: track.artists.map((a: any) => a.name).join(", "),
    album: track.album.name,
    albumArt: track.album.images[0]?.url || "",
    uri: track.uri,
  }));
}
