import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.21.0";
import { getValidSpotifyToken } from "../_shared/spotify-tokens.ts";

// Define SpotifyTrack type for edge function response
interface SpotifyTrack {
  id: string;
  name: string;
  artist: string;
  album: string;
  albumArt: string;
  uri: string;
  durationMs: number;
}

// Standard CORS headers for all requests
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  console.log("Spotify Search Function - Request received");
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
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
      console.error("Missing Supabase configuration");
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
    const token = authHeader.replace(/^Bearer\s/, "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      console.error("Error getting user from token:", userError);
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    
    const userId = user.id;
    console.log(`User authenticated: ${userId}`);
    
    // Get valid Spotify token (handles refresh automatically)
    const tokenResult = await getValidSpotifyToken(userId, supabase);
    
    if (!tokenResult.success || !tokenResult.accessToken) {
      return new Response(
        JSON.stringify({ error: tokenResult.error || "Failed to get Spotify token" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
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
        "Authorization": `Bearer ${tokenResult.accessToken}`
      }
    });
    
    const searchData = await searchResponse.json();
    
    if (searchData.error) {
      console.error("Spotify API error:", searchData.error);
      return new Response(
        JSON.stringify({ error: "Spotify search failed" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    
    // Format the response
    if (!searchData.tracks || !searchData.tracks.items) {
      console.error("Unexpected Spotify API response format:", searchData);
      return new Response(
        JSON.stringify({ error: "Spotify search failed" }),
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
      uri: track.uri,
      durationMs: track.duration_ms
    }));
    
    return new Response(
      JSON.stringify({ tracks: formattedTracks }),
      { headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error) {
    console.error("Error in Spotify search function:", error.message, error.stack);
    return new Response(
      JSON.stringify({ error: "Search failed" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
