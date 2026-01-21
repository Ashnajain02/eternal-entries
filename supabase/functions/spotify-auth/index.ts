import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.21.0";
import { encryptToken } from "../_shared/spotify-crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  console.log("Spotify Auth Function - Request received");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData = await req.json();
    const { action, code, redirect_uri } = requestData;
    console.log(`Action requested: ${action}`);
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    // Use service role to access the secure spotify_credentials table
    const supabase = createClient(supabaseUrl ?? "", supabaseKey ?? "");
    
    // Extract and validate JWT from Authorization header
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;
    
    if (authHeader) {
      try {
        const token = authHeader.replace(/^Bearer\s/, "");
        const { data: { user }, error: userError } = await supabase.auth.getUser(token);
        
        if (!userError && user) {
          userId = user.id;
          console.log(`User authenticated: ${userId}`);
        }
      } catch (error) {
        console.error("Error in auth verification:", error);
      }
    }

    // Route to appropriate handler
    switch (action) {
      case "authorize":
        return getAuthorizationUrl(redirect_uri);
      case "callback":
        if (!code) {
          return errorResponse("Missing authorization code", 400);
        }
        return handleCallback(code, redirect_uri, supabase, userId);
      case "revoke":
        return revokeAccess(supabase, userId);
      default:
        return errorResponse("Invalid action", 400);
    }
  } catch (error) {
    console.error("Error in Spotify Auth function:", error.message);
    return errorResponse("Server error", 500);
  }
});

function errorResponse(message: string, status: number) {
  return new Response(
    JSON.stringify({ error: message }),
    { status, headers: { "Content-Type": "application/json", ...corsHeaders } }
  );
}

function successResponse(data: object) {
  return new Response(
    JSON.stringify(data),
    { headers: { "Content-Type": "application/json", ...corsHeaders } }
  );
}

// Generate Spotify authorization URL
function getAuthorizationUrl(redirect_uri: string) {
  console.log("Generating authorization URL");
  
  const SPOTIFY_CLIENT_ID = Deno.env.get("SPOTIFY_CLIENT_ID");
  if (!SPOTIFY_CLIENT_ID) {
    return errorResponse("Missing Spotify client ID", 500);
  }

  const state = Math.random().toString(36).substring(2, 15);
  const scopes = [
    'user-read-private',
    'user-read-email',
    'user-top-read',
    'user-read-recently-played',
    'streaming',
    'user-modify-playback-state',
    'user-read-playback-state'
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
  console.log("Authorization URL created");
  
  return successResponse({ url: authUrl });
}

// Handle OAuth callback - exchange code for tokens and store them securely
async function handleCallback(
  code: string, 
  redirect_uri: string, 
  supabase: any, 
  userId: string | null
) {
  console.log("Processing OAuth callback");
  
  if (!userId) {
    return errorResponse("User not authenticated", 401);
  }
  
  const SPOTIFY_CLIENT_ID = Deno.env.get("SPOTIFY_CLIENT_ID");
  const SPOTIFY_CLIENT_SECRET = Deno.env.get("SPOTIFY_CLIENT_SECRET");
  
  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
    return errorResponse("Missing Spotify credentials", 500);
  }
  
  // Exchange authorization code for tokens
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
    console.error("Spotify token error:", tokenData.error, tokenData.error_description);
    
    let errorMessage = "Failed to get Spotify token";
    if (tokenData.error === "invalid_grant") {
      errorMessage = "Authorization code expired or already used. Please try connecting again.";
    } else if (tokenData.error_description) {
      errorMessage = tokenData.error_description;
    }
    
    return errorResponse(errorMessage, 400);
  }
  
  console.log("Successfully obtained Spotify tokens");
  
  // Fetch user profile from Spotify (includes premium status)
  const profileResponse = await fetch("https://api.spotify.com/v1/me", {
    headers: { "Authorization": `Bearer ${tokenData.access_token}` },
  });
  
  if (!profileResponse.ok) {
    const errorText = await profileResponse.text();
    console.error("Spotify profile error:", profileResponse.status, errorText);
    
    if (profileResponse.status === 403 || errorText.includes("Check settings")) {
      return errorResponse(
        "Spotify app is in Development Mode. Ask the app owner to add your Spotify email as a test user in the Spotify Developer Dashboard, or request Extended Quota Mode.",
        403
      );
    }
    
    return errorResponse("Failed to get Spotify profile", 400);
  }
  
  const profileData = await profileResponse.json();
  console.log(`Got Spotify profile for: ${profileData.display_name || profileData.id}`);
  
  // Check premium status
  const isPremium = profileData.product === "premium";
  console.log(`User premium status: ${isPremium}`);
  
  // Calculate token expiration
  const expiresAt = new Date();
  expiresAt.setSeconds(expiresAt.getSeconds() + tokenData.expires_in);
  
  // Encrypt tokens before storage
  const encryptedAccessToken = await encryptToken(tokenData.access_token);
  const encryptedRefreshToken = await encryptToken(tokenData.refresh_token);
  
  // Store encrypted tokens in the SECURE spotify_credentials table
  const { error: credentialsError } = await supabase.rpc("update_spotify_credentials", {
    p_user_id: userId,
    p_access_token: encryptedAccessToken,
    p_refresh_token: encryptedRefreshToken,
    p_expires_at: expiresAt.toISOString(),
  });
  
  if (credentialsError) {
    console.error("Error storing credentials:", credentialsError.message);
    return errorResponse("Failed to save Spotify credentials", 500);
  }
  
  // Store non-sensitive profile data (username, premium status) in profiles table
  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      spotify_username: profileData.id,
      spotify_is_premium: isPremium,
      updated_at: new Date().toISOString()
    })
    .eq("id", userId);
  
  if (profileError) {
    console.error("Error updating profile:", profileError.message);
    // Non-fatal - credentials are stored, profile data is optional
  }
  
  console.log("Successfully stored Spotify data securely");
  
  return successResponse({ 
    success: true,
    display_name: profileData.display_name,
    is_premium: isPremium,
  });
}

// Revoke Spotify access - clear credentials and profile data
async function revokeAccess(supabase: any, userId: string | null) {
  console.log("Revoking Spotify access");
  
  if (!userId) {
    return errorResponse("User not authenticated", 401);
  }
  
  // Delete from secure credentials table
  const { error: credentialsError } = await supabase.rpc("delete_spotify_credentials", {
    p_user_id: userId
  });
  
  if (credentialsError) {
    console.error("Error deleting credentials:", credentialsError);
  }
  
  // Clear non-sensitive Spotify data from profiles
  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      spotify_username: null,
      spotify_is_premium: null,
      // Clear legacy token columns if they exist
      spotify_access_token: null,
      spotify_refresh_token: null,
      spotify_token_expires_at: null,
      updated_at: new Date().toISOString()
    })
    .eq("id", userId);
  
  if (profileError) {
    console.error("Error clearing profile:", profileError);
    return errorResponse("Failed to revoke access", 500);
  }
  
  console.log("Successfully revoked Spotify access");
  return successResponse({ success: true });
}