import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.21.0";

// CORS headers for the function
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Encryption utility functions
async function encryptToken(token: string): Promise<string> {
  const encryptionKey = Deno.env.get("SPOTIFY_TOKEN_ENCRYPTION_KEY");
  if (!encryptionKey) {
    throw new Error("Encryption key not configured");
  }

  // Convert the encryption key to a CryptoKey
  const keyData = new TextEncoder().encode(encryptionKey);
  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"]
  );

  // Generate a random IV
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // Encrypt the token
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(token)
  );

  // Combine IV and encrypted data, then base64 encode
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.length);

  return btoa(String.fromCharCode(...combined));
}

serve(async (req) => {
  console.log("Spotify Auth Function - Request received");
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    console.log("Handling CORS preflight request");
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Parsing request body");

    // Parse request body
    const requestData = await req.json();
    const { action, code, redirect_uri } = requestData;
    console.log(`Action requested: ${action}`);
    
    // Create a Supabase client with the service role key
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    const supabase = createClient(
      supabaseUrl ?? "",
      supabaseKey ?? ""
    );
    
    // Extract JWT token from Authorization header
    const authHeader = req.headers.get("Authorization");
    console.log(`Auth header present: ${Boolean(authHeader)}`);
    
    // Get user ID from JWT if Authorization header is present
    let userId = null;
    if (authHeader) {
      try {
        // Extract the JWT token (remove 'Bearer ' prefix if present)
        const token = authHeader.replace(/^Bearer\s/, "");
        
        // Verify the JWT and get user information
        const { data: { user }, error: userError } = await supabase.auth.getUser(token);
        
        if (userError) {
          console.error("Error getting user from token:", userError);
        } else if (user) {
          userId = user.id;
          console.log(`User authenticated: ${userId}`);
        }
      } catch (error) {
        console.error("Error in auth verification:", error);
      }
    }

    // Handle different actions
    if (action === "is_token_expired") {
      return await isTokenExpired(supabase, userId);
    } else if (action === "authorize") {
      return await getAuthorizationUrl(redirect_uri);
    } else if (action === "callback" && code) {
      return await handleCallback(code, redirect_uri, supabase, userId);
    } else if (action === "revoke") {
      return await revokeAccess(supabase, userId);
    }

    console.log("Invalid request action");
    return new Response(
      JSON.stringify({ error: "Invalid request" }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error) {
    console.error("Error in Spotify Auth function:", error.message);
    return new Response(
      JSON.stringify({ error: "Server error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});

// Check if the Spotify token is expired
async function isTokenExpired(supabase: any, user_id: string | null) {
  console.log("Running isTokenExpired function");
  try {
    if (!user_id) {
      return new Response(
        JSON.stringify({ error: "User not authenticated" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    
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
async function getAuthorizationUrl(redirect_uri: string) {
  console.log("Running getAuthorizationUrl function");
  try {
    const SPOTIFY_CLIENT_ID = Deno.env.get("SPOTIFY_CLIENT_ID");
    console.log(`Spotify Client ID available: ${Boolean(SPOTIFY_CLIENT_ID)}`);

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
    console.log(`Authorization URL created: ${authUrl}`);
    
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
async function handleCallback(code: string, redirect_uri: string, supabase: any, user_id: string | null) {
  console.log("Running handleCallback function");
  
  try {
    if (!user_id) {
      return new Response(
        JSON.stringify({ error: "User not authenticated" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    
    const SPOTIFY_CLIENT_ID = Deno.env.get("SPOTIFY_CLIENT_ID");
    const SPOTIFY_CLIENT_SECRET = Deno.env.get("SPOTIFY_CLIENT_SECRET");
    console.log(`Spotify credentials available: ${Boolean(SPOTIFY_CLIENT_ID && SPOTIFY_CLIENT_SECRET)}`);
    
    if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
      return new Response(
        JSON.stringify({ error: "Missing Spotify credentials" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    
    console.log(`Exchanging code for token with redirect URI: ${redirect_uri}`);
    
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
    
    console.log("Successfully obtained Spotify token");
    
    // Get user profile from Spotify
    const profileResponse = await fetch("https://api.spotify.com/v1/me", {
      headers: {
        "Authorization": `Bearer ${tokenData.access_token}`,
      },
    });
    
    const profileData = await profileResponse.json();
    console.log(`Got Spotify profile for: ${profileData.display_name || profileData.id}`);
    
    // Calculate token expiration time
    const expires_at = new Date();
    expires_at.setSeconds(expires_at.getSeconds() + tokenData.expires_in);
    
    // Encrypt tokens before storing
    console.log("Encrypting Spotify tokens");
    const encryptedAccessToken = await encryptToken(tokenData.access_token);
    const encryptedRefreshToken = await encryptToken(tokenData.refresh_token);
    
    // Store the encrypted tokens in the database
    const { error } = await supabase.rpc("update_profile_spotify_data", {
      p_user_id: user_id,
      p_access_token: encryptedAccessToken,
      p_refresh_token: encryptedRefreshToken,
      p_expires_at: expires_at.toISOString(),
      p_username: profileData.id,
    });
    
    if (error) {
      console.error("Database error:", error.message);
      return new Response(
        JSON.stringify({ error: "Failed to save Spotify data" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    
    console.log("Successfully stored Spotify data in database");
    
    return new Response(
      JSON.stringify({ 
        success: true,
        display_name: profileData.display_name,
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
async function revokeAccess(supabase: any, user_id: string | null) {
  console.log("Running revokeAccess function");
  try {
    if (!user_id) {
      return new Response(
        JSON.stringify({ error: "User not authenticated" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    
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
    
    console.log("Successfully revoked Spotify access");
    
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
