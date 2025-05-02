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
      console.log("Spotify Client ID available:", !!clientId);
      
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
      console.error("Auth error:", userError);
      return new Response(
        JSON.stringify({ error: "Unauthorized", details: userError?.message }),
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
      
      console.log("Processing callback with code:", code.substring(0, 5) + "...");
      console.log("User ID for Spotify connection:", user.id);
      
      // Exchange the code for an access token
      // Use the same redirect URI as in the authorization request
      const originUrl = new URL(req.headers.get("Origin") || url.origin);
      const redirectUri = `${originUrl.origin}/spotify-callback`;
      
      console.log("Using redirect URI for token exchange:", redirectUri);
      
      if (!clientId || !clientSecret) {
        console.error("Missing Spotify credentials:", { 
          clientIdAvailable: !!clientId,
          clientSecretAvailable: !!clientSecret 
        });
        
        return new Response(
          JSON.stringify({ error: "Spotify API credentials not configured" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
        );
      }
      
      // Add a debug check to verify the auth session
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession(token);
      if (sessionError) {
        console.error("Session verification error:", sessionError);
        return new Response(
          JSON.stringify({ error: "Unauthorized", details: "Auth session missing!" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
        );
      }
      
      console.log("Session verified, user authenticated:", !!sessionData.session);
      
      try {
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
        
        console.log("Token exchange response status:", tokenResponse.status);
        
        if (!tokenResponse.ok) {
          const responseText = await tokenResponse.text();
          console.error("Token exchange error response:", responseText);
          try {
            const error = JSON.parse(responseText);
            throw new Error(error.error_description || error.error);
          } catch (parseError) {
            throw new Error(`Token exchange failed: ${tokenResponse.status} ${responseText}`);
          }
        }
        
        const tokenData = await tokenResponse.json();
        
        if (tokenData.error) {
          console.error("Token exchange error:", tokenData);
          return new Response(
            JSON.stringify({ error: tokenData.error_description || tokenData.error }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
          );
        }
        
        console.log("Token exchange successful, access token received");
        
        // Get the user's Spotify profile
        const profileResponse = await fetch("https://api.spotify.com/v1/me", {
          headers: {
            "Authorization": `Bearer ${tokenData.access_token}`,
          },
        });
        
        console.log("Profile response status:", profileResponse.status);
        
        if (!profileResponse.ok) {
          const errorText = await profileResponse.text();
          console.error("Profile fetch error:", errorText);
          
          try {
            const profileError = JSON.parse(errorText);
            return new Response(
              JSON.stringify({ error: profileError.error.message || "Failed to fetch Spotify profile" }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: profileResponse.status }
            );
          } catch (parseError) {
            return new Response(
              JSON.stringify({ error: "Failed to fetch Spotify profile" }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
            );
          }
        }
        
        const profileData = await profileResponse.json();
        
        console.log("Profile fetch successful, username:", profileData.display_name || profileData.id);
        
        // Calculate token expiration
        const expiresAt = new Date();
        expiresAt.setSeconds(expiresAt.getSeconds() + tokenData.expires_in);
        
        try {
          // First check if the profile exists
          const { data: existingProfile, error: profileCheckError } = await supabase
            .from("profiles")
            .select("id")
            .eq("id", user.id)
            .maybeSingle();
            
          if (profileCheckError) {
            console.error("Error checking profile:", profileCheckError);
            throw profileCheckError;
          }
          
          // If profile doesn't exist, create it first
          if (!existingProfile) {
            console.log("Profile doesn't exist, creating new profile for:", user.id);
            
            // First get user data from auth table
            const { data: userData, error: userDataError } = await supabase
              .from("users")
              .select("email, first_name, last_name")
              .eq("id", user.id)
              .maybeSingle();
            
            if (userDataError) {
              console.error("Error getting user data:", userDataError);
              // Fall back to auth metadata
              const metadata = user.user_metadata || {};
              
              const { error: createError } = await supabase
                .from("profiles")
                .insert({
                  id: user.id,
                  username: user.email || metadata.email,
                  first_name: metadata.first_name || null,
                  last_name: metadata.last_name || null,
                  spotify_access_token: tokenData.access_token,
                  spotify_refresh_token: tokenData.refresh_token,
                  spotify_token_expires_at: expiresAt.toISOString(),
                  spotify_username: profileData.display_name || profileData.id,
                });
                
              if (createError) {
                console.error("Error creating profile:", createError);
                throw createError;
              }
            } else {
              // Use user data from the users table
              const { error: createError } = await supabase
                .from("profiles")
                .insert({
                  id: user.id,
                  username: userData.email,
                  first_name: userData.first_name,
                  last_name: userData.last_name,
                  spotify_access_token: tokenData.access_token,
                  spotify_refresh_token: tokenData.refresh_token,
                  spotify_token_expires_at: expiresAt.toISOString(),
                  spotify_username: profileData.display_name || profileData.id,
                });
                
              if (createError) {
                console.error("Error creating profile:", createError);
                throw createError;
              }
            }
          } else {
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
              throw updateError;
            }
          }
          
          console.log("Profile updated successfully with Spotify tokens for user:", user.id);
        } catch (dbError) {
          console.error("Database error when saving tokens:", dbError);
          return new Response(
            JSON.stringify({ error: "Failed to save Spotify credentials", details: dbError.message }),
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
      } catch (spotifyError) {
        console.error("Spotify API error:", spotifyError);
        return new Response(
          JSON.stringify({ error: spotifyError.message || "Spotify API error" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
        );
      }
    } else if (path === "refresh") {
      // Get the user's refresh token
      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("spotify_refresh_token")
        .eq("id", user.id)
        .maybeSingle();
      
      if (profileError || !profiles?.spotify_refresh_token) {
        console.error("No refresh token found:", profileError);
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
          refresh_token: profiles.spotify_refresh_token,
        }),
      });
      
      if (!refreshResponse.ok) {
        const refreshErrorText = await refreshResponse.text();
        console.error("Refresh token error:", refreshErrorText);
        
        try {
          const refreshError = JSON.parse(refreshErrorText);
          return new Response(
            JSON.stringify({ error: refreshError.error_description || refreshError.error }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: refreshResponse.status }
          );
        } catch (parseError) {
          return new Response(
            JSON.stringify({ error: `Failed to refresh token: ${refreshResponse.status} ${refreshErrorText}` }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
          );
        }
      }
      
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
        console.error("Error updating tokens:", updateError);
        return new Response(
          JSON.stringify({ error: "Failed to update tokens" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
        );
      }
      
      console.log("Token refresh successful, updated tokens in database");
      
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
        console.error("Error revoking Spotify access:", updateError);
        return new Response(
          JSON.stringify({ error: "Failed to revoke Spotify access" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
        );
      }
      
      console.log("Successfully revoked Spotify access for user:", user.id);
      
      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else if (path === "search") {
      // Get user's Spotify token
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("spotify_access_token, spotify_token_expires_at")
        .eq("id", user.id)
        .maybeSingle();
      
      if (profileError || !profile?.spotify_access_token) {
        console.error("Spotify token not found:", profileError);
        return new Response(
          JSON.stringify({ error: "Not connected to Spotify" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }
      
      // Check if token is expired
      const isExpired = !profile.spotify_token_expires_at || new Date(profile.spotify_token_expires_at) < new Date();
      
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
            "Authorization": `Bearer ${profile.spotify_access_token}`,
          },
        }
      );
      
      if (!searchResponse.ok) {
        const searchErrorText = await searchResponse.text();
        console.error("Search error:", searchErrorText);
        
        try {
          const searchError = JSON.parse(searchErrorText);
          return new Response(
            JSON.stringify({ error: searchError.error.message || "Search failed" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: searchResponse.status }
          );
        } catch (parseError) {
          return new Response(
            JSON.stringify({ error: `Search failed: ${searchResponse.status} ${searchErrorText}` }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
          );
        }
      }
      
      const searchData = await searchResponse.json();
      
      if (!searchData.tracks || !searchData.tracks.items) {
        return new Response(
          JSON.stringify({ error: "Invalid response from Spotify" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
        );
      }
      
      // Transform the response to match our app's format
      const tracks = searchData.tracks.items.map((track: any) => ({
        id: track.id,
        name: track.name,
        artist: track.artists.map((a: any) => a.name).join(", "),
        album: track.album.name,
        albumArt: track.album.images[0]?.url,
        uri: track.uri,
      }));
      
      return new Response(
        JSON.stringify({ tracks }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else if (path === "status") {
      // Get the user's Spotify connection status
      try {
        console.log("Checking Spotify status for user:", user.id);
        
        // First check if the profile exists
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("spotify_username, spotify_token_expires_at, spotify_access_token")
          .eq("id", user.id)
          .maybeSingle();
        
        if (profileError && profileError.code !== 'PGRST116') { // PGRST116 means no rows returned
          console.error("Error getting profile:", profileError);
          return new Response(
            JSON.stringify({ error: "Failed to get profile", details: profileError.message }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
          );
        }
        
        // If no profile exists, report as not connected
        if (!profile) {
          return new Response(
            JSON.stringify({
              connected: false,
              expired: false,
              username: null,
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        const isConnected = !!profile.spotify_access_token && !!profile.spotify_username;
        const isExpired = !profile.spotify_token_expires_at || new Date(profile.spotify_token_expires_at) < new Date();
        
        console.log("Spotify connection status:", {
          connected: isConnected,
          expired: isConnected && isExpired,
          username: profile.spotify_username || null,
        });
        
        return new Response(
          JSON.stringify({
            connected: isConnected,
            expired: isConnected && isExpired,
            username: profile.spotify_username || null,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (error) {
        console.error("Error checking status:", error);
        return new Response(
          JSON.stringify({ error: "Failed to check status", details: error.message }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
        );
      }
    } else {
      return new Response(
        JSON.stringify({ error: "Invalid endpoint" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }
  } catch (error) {
    console.error("Unhandled error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
