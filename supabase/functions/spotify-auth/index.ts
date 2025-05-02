
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
    // Get the token from the request
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
        JSON.stringify({ error: "Unauthorized", details: userError?.message }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    // Parse request body to get the action and parameters
    let action, params;
    const contentType = req.headers.get("content-type") || "";
    
    if (contentType.includes("application/json")) {
      const body = await req.json();
      action = body.action;
      params = body;
    } else {
      // For backward compatibility with URL-based params
      const url = new URL(req.url);
      action = url.pathname.split("/").pop();
      params = Object.fromEntries(url.searchParams);
    }
    
    console.log(`Request to ${action} endpoint with params:`, params);
    
    // Authorize endpoint - provide proper Spotify authorization URL
    if (action === "authorize") {
      const redirect_uri = params.redirect_uri;
      const scope = params.scope;
      const show_dialog = params.show_dialog === "true";
      
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
    
    // Callback endpoint - exchange code for tokens
    else if (action === "callback") {
      // Handle the OAuth callback from Spotify
      const code = params.code;
      // Get the redirect_uri that was used for the original authorization request
      const redirect_uri = params.redirect_uri;
      
      console.log("Callback request params:", { 
        codePresent: !!code, 
        codeLength: code ? code.length : 0,
        redirect_uri,
        userId: user.id
      });
      
      if (!code) {
        return new Response(
          JSON.stringify({ error: "No authorization code provided" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }
      
      // Use the provided redirect_uri or fallback to constructing one
      const redirectUri = redirect_uri || `${new URL(req.url).origin}/spotify-callback`;
      
      console.log("Using redirect URI for token exchange:", redirectUri);
      console.log("Client credentials available:", { 
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
        console.error("Token exchange error:", tokenData);
        return new Response(
          JSON.stringify({ 
            error: tokenData.error, 
            error_description: tokenData.error_description,
            details: `Redirect URI: ${redirectUri}, Code length: ${code.length}`
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }
      
      console.log("Token exchange successful. Got tokens:", {
        access_token_present: !!tokenData.access_token,
        refresh_token_present: !!tokenData.refresh_token,
        expires_in: tokenData.expires_in
      });
      
      // Get the user's Spotify profile
      const profileResponse = await fetch("https://api.spotify.com/v1/me", {
        headers: {
          "Authorization": `Bearer ${tokenData.access_token}`,
        },
      });
      
      const profileData = await profileResponse.json();
      
      if (profileData.error) {
        console.error("Error fetching Spotify profile:", profileData.error);
        return new Response(
          JSON.stringify({ 
            error: "Failed to fetch Spotify profile",
            details: profileData.error
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }
      
      console.log("Got Spotify profile:", {
        id: profileData.id,
        display_name: profileData.display_name,
        email: profileData.email
      });
      
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
          JSON.stringify({ 
            error: "Failed to save Spotify credentials", 
            details: updateError.message
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
        );
      }
      
      console.log("Successfully updated user profile with Spotify credentials");
      
      return new Response(
        JSON.stringify({ 
          success: true,
          display_name: profileData.display_name,
          expires_at: expiresAt.toISOString() 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Refresh endpoint - refresh tokens
    else if (action === "refresh") {
      // Get the user's refresh token
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("spotify_refresh_token")
        .eq("id", user.id)
        .single();
      
      if (profileError || !profile.spotify_refresh_token) {
        return new Response(
          JSON.stringify({ error: "No refresh token found", details: profileError?.message }),
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
    }
    
    // Revoke endpoint - disconnect from Spotify
    else if (action === "revoke") {
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
    }
    
    // Search endpoint - search Spotify tracks
    else if (action === "search") {
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
      
      // Get query parameter
      const query = params.q || "";
      
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
    }
    
    // Status endpoint - check Spotify connection status
    else if (action === "status") {
      console.log("Checking Spotify status for user:", user.id);
      
      // Get the user's Spotify connection status
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("spotify_username, spotify_token_expires_at, spotify_access_token")
        .eq("id", user.id)
        .single();
      
      if (profileError) {
        console.error("Error getting profile:", profileError);
        return new Response(
          JSON.stringify({ error: "Failed to get profile", details: profileError.message }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
        );
      }
      
      console.log("Retrieved profile data:", {
        has_username: !!profile.spotify_username,
        has_token: !!profile.spotify_access_token,
        expires_at: profile.spotify_token_expires_at
      });
      
      const isConnected = !!profile.spotify_username && !!profile.spotify_access_token;
      const isExpired = !profile.spotify_token_expires_at || new Date(profile.spotify_token_expires_at) < new Date();
      
      return new Response(
        JSON.stringify({
          connected: isConnected,
          expired: isConnected && isExpired,
          username: profile.spotify_username || null,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Invalid endpoint
    else {
      return new Response(
        JSON.stringify({ error: "Invalid action" }),
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
