
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.21.0";
import { SpotifyTrack } from "../../../src/types/index.ts";

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
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Extract JWT token from Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization header missing" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    
    // Get user ID from JWT
    let userId = null;
    const token = authHeader.replace(/^Bearer\s/, "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      console.error("Error getting user from token:", userError);
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    
    userId = user.id;
    console.log(`User authenticated: ${userId}`);
    
    // Get the user's Spotify token
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("spotify_access_token, spotify_refresh_token, spotify_token_expires_at")
      .eq("id", userId)
      .single();
    
    if (profileError || !profileData) {
      console.error("Error getting user profile:", profileError);
      return new Response(
        JSON.stringify({ error: "Failed to retrieve user profile" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    
    const { spotify_access_token, spotify_refresh_token, spotify_token_expires_at } = profileData;
    
    if (!spotify_access_token || !spotify_refresh_token) {
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
        return new Response(
          JSON.stringify({ error: "Server configuration error" }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      
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
          JSON.stringify({ error: "Failed to refresh Spotify token" }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      
      // Update token in database
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
        JSON.stringify({ error: "Spotify API error", details: searchData.error }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    
    // Format the response
    const formattedTracks: SpotifyTrack[] = searchData.tracks.items.map((track: any) => ({
      id: track.id,
      name: track.name,
      artist: track.artists.map((artist: any) => artist.name).join(", "),
      album: track.album.name,
      albumArt: track.album.images[1]?.url || track.album.images[0]?.url || '',
      uri: track.uri
    }));
    
    return new Response(
      JSON.stringify({ tracks: formattedTracks }),
      { headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error) {
    console.error("Error in Spotify search function:", error);
    return new Response(
      JSON.stringify({ error: "Server error", details: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
