
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.21.0";

// Define SpotifyTrack type directly in this file instead of importing from frontend
interface SpotifyTrack {
  id: string;
  name: string;
  artist: string;
  album: string;
  albumArt: string;
  uri: string;
}

// CORS headers for the function
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  console.log("Spotify Search Function - Request received");
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    console.log("Handling CORS preflight request");
    return new Response(null, { 
      headers: corsHeaders,
      status: 204 // Explicitly set 204 status for OPTIONS
    });
  }

  try {
    console.log("Parsing request body");

    // Parse request body
    const requestData = await req.json();
    const { query, type = 'track', limit = 10 } = requestData;
    
    if (!query) {
      return new Response(
        JSON.stringify({ error: "Query parameter is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    
    // Create a Supabase client with the service role key
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing Supabase URL or key:", { 
        hasUrl: !!supabaseUrl, 
        hasKey: !!supabaseKey 
      });
      return new Response(
        JSON.stringify({ 
          error: "Server configuration error",
          details: "Missing Supabase URL or service role key"
        }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Creating Supabase client");
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Extract JWT token from Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("No Authorization header present");
      return new Response(
        JSON.stringify({ error: "Authorization header missing" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    
    // Get user ID from JWT
    let userId = null;
    const token = authHeader.replace(/^Bearer\s/, "");
    console.log("Getting user from token");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      console.error("Error getting user from token:", userError);
      return new Response(
        JSON.stringify({ error: "Invalid authentication", details: userError?.message }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    
    userId = user.id;
    console.log(`User authenticated: ${userId}`);
    
    // Get the user's Spotify token
    console.log("Fetching user profile");
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("spotify_access_token, spotify_refresh_token, spotify_token_expires_at")
      .eq("id", userId)
      .single();
    
    if (profileError || !profileData) {
      console.error("Error getting user profile:", profileError);
      return new Response(
        JSON.stringify({ 
          error: "Failed to retrieve user profile", 
          details: profileError?.message 
        }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    
    const { spotify_access_token, spotify_refresh_token, spotify_token_expires_at } = profileData;
    
    if (!spotify_access_token || !spotify_refresh_token) {
      console.error("Spotify not connected for user");
      return new Response(
        JSON.stringify({ error: "Spotify not connected" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    
    // Check if token is expired and refresh if needed
    let accessToken = spotify_access_token;
    const now = new Date();
    const expires_at = new Date(spotify_token_expires_at);
    
    if (now >= expires_at) {
      console.log("Token expired, refreshing...");
      
      // Refresh the token
      const SPOTIFY_CLIENT_ID = Deno.env.get("SPOTIFY_CLIENT_ID");
      const SPOTIFY_CLIENT_SECRET = Deno.env.get("SPOTIFY_CLIENT_SECRET");
      
      if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
        console.error("Missing Spotify credentials:", {
          hasClientId: !!SPOTIFY_CLIENT_ID,
          hasClientSecret: !!SPOTIFY_CLIENT_SECRET
        });
        return new Response(
          JSON.stringify({ 
            error: "Server configuration error",
            details: "Missing Spotify API credentials"
          }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      
      console.log("Refreshing Spotify token");
      const refreshResponse = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Authorization": `Basic ${btoa(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`)}`
        },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: spotify_refresh_token
        })
      });
      
      const refreshData = await refreshResponse.json();
      
      if (refreshData.error) {
        console.error("Error refreshing token:", refreshData.error);
        return new Response(
          JSON.stringify({ 
            error: "Failed to refresh Spotify token",
            details: refreshData.error
          }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      
      // Update token in database
      console.log("Updating token in database");
      const newExpiresAt = new Date();
      newExpiresAt.setSeconds(newExpiresAt.getSeconds() + refreshData.expires_in);
      
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          spotify_access_token: refreshData.access_token,
          spotify_token_expires_at: newExpiresAt.toISOString()
        })
        .eq("id", userId);
      
      if (updateError) {
        console.error("Error updating tokens:", updateError);
      }
      
      accessToken = refreshData.access_token;
    }
    
    // Search Spotify API
    console.log("Searching Spotify API");
    const searchParams = new URLSearchParams({
      q: query,
      type,
      limit: limit.toString()
    });
    
    const searchResponse = await fetch(`https://api.spotify.com/v1/search?${searchParams.toString()}`, {
      headers: {
        "Authorization": `Bearer ${accessToken}`
      }
    });
    
    const searchData = await searchResponse.json();
    
    if (searchData.error) {
      console.error("Spotify API error:", searchData.error);
      return new Response(
        JSON.stringify({ 
          error: "Spotify API error", 
          details: searchData.error 
        }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    
    // Format the response
    if (!searchData.tracks || !searchData.tracks.items) {
      console.error("Unexpected Spotify API response format:", searchData);
      return new Response(
        JSON.stringify({ 
          error: "Unexpected response from Spotify API",
          details: "Missing tracks data"
        }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    
    console.log(`Found ${searchData.tracks.items.length} tracks`);
    const formattedTracks: SpotifyTrack[] = searchData.tracks.items.map((track: any) => ({
      id: track.id,
      name: track.name,
      artist: track.artists.map((artist: any) => artist.name).join(", "),
      album: track.album.name,
      albumArt: track.album.images[1]?.url || track.album.images[0]?.url || '',
      uri: track.uri
    }));
    
    console.log("Search completed successfully");
    return new Response(
      JSON.stringify({ tracks: formattedTracks }),
      { headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error) {
    console.error("Error in Spotify search function:", error);
    return new Response(
      JSON.stringify({ 
        error: "Server error", 
        details: error.message,
        stack: error.stack
      }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
