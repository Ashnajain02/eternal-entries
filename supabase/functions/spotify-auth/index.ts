import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

// Define required types
interface SpotifyTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
}

interface SpotifyUserResponse {
  id: string;
  display_name: string;
  email: string;
  images: Array<{ url: string }>;
}

interface SpotifySearchResponse {
  tracks: {
    items: Array<{
      id: string;
      name: string;
      album: {
        name: string;
        images: Array<{ url: string }>;
      };
      artists: Array<{ name: string }>;
      uri: string;
    }>;
  };
}

// Define CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Create Supabase client
const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") || "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
);

// Use the Spotify client credentials from the secrets
const SPOTIFY_CLIENT_ID = Deno.env.get("SPOTIFY_CLIENT_ID") || "834fb4c11be949b2b527500c41e2cec5";
const SPOTIFY_CLIENT_SECRET = Deno.env.get("SPOTIFY_CLIENT_SECRET") || "91843f81dc254191988e61a23993aa18";

// Helper to store tokens in the database
async function storeSpotifyTokens(userId: string, tokens: SpotifyTokenResponse, profile: SpotifyUserResponse) {
  try {
    const expires_at = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
    
    // Check if a record for this user already exists
    const { data: existingData } = await supabaseAdmin
      .from("spotify_connections")
      .select("id")
      .eq("user_id", userId)
      .single();
    
    if (existingData) {
      // Update existing record
      await supabaseAdmin
        .from("spotify_connections")
        .update({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_at,
          username: profile.display_name,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);
    } else {
      // Create new record
      await supabaseAdmin.from("spotify_connections").insert({
        user_id: userId,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at,
        username: profile.display_name,
        spotify_id: profile.id,
      });
    }
    
    return true;
  } catch (error) {
    console.error("Error storing Spotify tokens:", error);
    return false;
  }
}

// Helper to get tokens from the database
async function getSpotifyTokens(userId: string) {
  try {
    const { data, error } = await supabaseAdmin
      .from("spotify_connections")
      .select("*")
      .eq("user_id", userId)
      .single();
    
    if (error) throw error;
    
    if (!data) {
      return null;
    }
    
    // Check if token is expired
    const now = new Date();
    const expires_at = new Date(data.expires_at);
    const isExpired = now >= expires_at;
    
    if (isExpired && data.refresh_token) {
      // Refresh the token
      const refreshed = await refreshSpotifyToken(userId, data.refresh_token);
      if (refreshed) {
        // Get the updated tokens
        return getSpotifyTokens(userId);
      }
      return null;
    }
    
    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: data.expires_at,
      username: data.username,
      isExpired,
    };
  } catch (error) {
    console.error("Error getting Spotify tokens:", error);
    return null;
  }
}

// Helper to refresh an expired token
async function refreshSpotifyToken(userId: string, refresh_token: string) {
  try {
    // Use the client credentials from the secrets
    const clientId = SPOTIFY_CLIENT_ID;
    const clientSecret = SPOTIFY_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
      throw new Error("Spotify client credentials not configured");
    }
    
    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token,
      }),
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error("Spotify token refresh failed:", error);
      return false;
    }
    
    const tokens = await response.json();
    const expires_at = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
    
    // Update in database
    await supabaseAdmin
      .from("spotify_connections")
      .update({
        access_token: tokens.access_token,
        expires_at,
        updated_at: new Date().toISOString(),
        // Only update refresh_token if we got a new one
        ...(tokens.refresh_token ? { refresh_token: tokens.refresh_token } : {}),
      })
      .eq("user_id", userId);
    
    return true;
  } catch (error) {
    console.error("Error refreshing token:", error);
    return false;
  }
}

// Helper to remove tokens from the database
async function removeSpotifyTokens(userId: string) {
  try {
    await supabaseAdmin
      .from("spotify_connections")
      .delete()
      .eq("user_id", userId);
    
    return true;
  } catch (error) {
    console.error("Error removing Spotify tokens:", error);
    return false;
  }
}

// Handle requests
serve(async (req) => {
  // Handle CORS for preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }
  
  try {
    const { authorization } = req.headers;
    
    // Get the JWT token from the request
    const token = authorization?.replace("Bearer ", "");
    if (!token) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    // Verify the JWT token
    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    
    if (!user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    // Parse request body
    const requestData = await req.json();
    const { action } = requestData;
    
    // Handle different actions
    switch (action) {
      case "authorize": {
        // The authorize action should generate a Spotify authorization URL
        const { redirect_uri, scope, show_dialog } = requestData;
        
        if (!redirect_uri) {
          return new Response(
            JSON.stringify({ error: "Missing redirect URI" }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
        
        // Generate a state parameter for security
        const state = crypto.randomUUID();
        
        // Build the authorization URL
        const authUrl = new URL("https://accounts.spotify.com/authorize");
        authUrl.searchParams.append("client_id", SPOTIFY_CLIENT_ID);
        authUrl.searchParams.append("response_type", "code");
        authUrl.searchParams.append("redirect_uri", redirect_uri);
        authUrl.searchParams.append("state", state);
        authUrl.searchParams.append("scope", scope || "");
        if (show_dialog === "true") {
          authUrl.searchParams.append("show_dialog", "true");
        }
        
        return new Response(
          JSON.stringify({ url: authUrl.toString(), state }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      case "callback": {
        // Handle the callback from Spotify
        const { code, redirect_uri, user_id } = requestData;
        
        if (!code || !redirect_uri) {
          return new Response(
            JSON.stringify({ error: "Missing code or redirect URI" }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
        
        // Exchange the authorization code for tokens
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
        
        if (!tokenResponse.ok) {
          const errorText = await tokenResponse.text();
          console.error("Token exchange failed:", errorText);
          
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: "Failed to exchange token", 
              details: errorText 
            }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
        
        const tokens: SpotifyTokenResponse = await tokenResponse.json();
        
        // Get the user's Spotify profile
        const profileResponse = await fetch("https://api.spotify.com/v1/me", {
          headers: {
            Authorization: `Bearer ${tokens.access_token}`,
          },
        });
        
        if (!profileResponse.ok) {
          return new Response(
            JSON.stringify({ success: false, error: "Failed to get Spotify profile" }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
        
        const profile: SpotifyUserResponse = await profileResponse.json();
        
        // Calculate token expiration
        const expires_at = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
        
        // Get or create the user's profile
        const { data: profileData, error: profileError } = await supabaseAdmin
          .from("profiles")
          .select("id")
          .eq("id", user_id)
          .single();
          
        if (profileError && profileError.code !== "PGRST116") {
          // Try to create the profile if it doesn't exist
          await supabaseAdmin
            .from("profiles")
            .insert({
              id: user_id,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .select()
            .single();
        }
        
        // Update the profile with Spotify data
        const { error: updateError } = await supabaseAdmin
          .from("profiles")
          .update({
            spotify_access_token: tokens.access_token,
            spotify_refresh_token: tokens.refresh_token,
            spotify_token_expires_at: expires_at,
            spotify_username: profile.display_name,
            updated_at: new Date().toISOString(),
          })
          .eq("id", user_id);
        
        if (updateError) {
          console.error("Error updating profile:", updateError);
          
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: "Failed to store tokens", 
              details: updateError.message
            }),
            {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
        
        return new Response(
          JSON.stringify({
            success: true,
            display_name: profile.display_name,
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            expires_at,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      case "check-connection": {
        const tokens = await getSpotifyTokens(user.id);
        
        return new Response(
          JSON.stringify({
            connected: !!tokens,
            expired: tokens ? new Date() >= new Date(tokens.expires_at) : false,
            username: tokens?.username || null,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      case "search-tracks": {
        const { query } = requestData;
        
        if (!query) {
          return new Response(
            JSON.stringify({ error: "Missing search query" }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
        
        // Get the user's Spotify tokens
        const tokens = await getSpotifyTokens(user.id);
        
        if (!tokens) {
          return new Response(
            JSON.stringify({ error: "Not connected to Spotify" }),
            {
              status: 401,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
        
        // Search for tracks
        const searchResponse = await fetch(
          `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=10`,
          {
            headers: {
              Authorization: `Bearer ${tokens.access_token}`,
            },
          }
        );
        
        if (!searchResponse.ok) {
          const error = await searchResponse.text();
          console.error("Spotify search failed:", error);
          
          // Handle token expiration or other errors
          if (searchResponse.status === 401) {
            return new Response(
              JSON.stringify({ error: "Your Spotify token has expired" }),
              {
                status: 401,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              }
            );
          }
          
          return new Response(
            JSON.stringify({ error: "Failed to search Spotify" }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
        
        const searchData: SpotifySearchResponse = await searchResponse.json();
        
        // Format the tracks
        const tracks = searchData.tracks.items.map((track) => ({
          id: track.id,
          name: track.name,
          artist: track.artists.map((artist) => artist.name).join(", "),
          album: track.album.name,
          albumArt: track.album.images[0]?.url || "",
          uri: track.uri,
        }));
        
        return new Response(JSON.stringify({ tracks }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      case "revoke": {
        const success = await removeSpotifyTokens(user.id);
        
        return new Response(
          JSON.stringify({
            success,
            message: success ? "Successfully disconnected" : "Failed to disconnect",
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      default:
        return new Response(
          JSON.stringify({ error: "Invalid action" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
    }
  } catch (error) {
    console.error("Error in Spotify auth function:", error);
    
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
