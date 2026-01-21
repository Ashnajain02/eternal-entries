import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.21.0";
import { getValidSpotifyToken, hasSpotifyCredentials } from "../_shared/spotify-tokens.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  console.log("Spotify Playback Token - Request received");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData = await req.json();
    const { action } = requestData;
    console.log(`Action requested: ${action}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseKey) {
      return errorResponse("Server configuration error", 500);
    }
    
    // Use service role to access the secure spotify_credentials table
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Validate JWT from Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return errorResponse("Unauthorized", 401);
    }

    const token = authHeader.replace(/^Bearer\s/, "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return errorResponse("Unauthorized", 401);
    }

    const userId = user.id;
    console.log(`User authenticated: ${userId}`);

    if (action === "get_token") {
      return await getToken(supabase, userId);
    }

    if (action === "is_connected") {
      return await isConnected(supabase, userId);
    }

    return errorResponse("Invalid action", 400);
  } catch (error) {
    console.error("Error:", error.message);
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

// Check if user has Spotify credentials stored in the SECURE table
async function isConnected(supabase: ReturnType<typeof createClient>, userId: string) {
  const connected = await hasSpotifyCredentials(userId, supabase);
  return successResponse({ connected });
}

// Get a valid access token using shared utility (handles refresh automatically)
async function getToken(supabase: ReturnType<typeof createClient>, userId: string) {
  const tokenResult = await getValidSpotifyToken(userId, supabase);

  if (!tokenResult.success) {
    console.log("Token retrieval failed:", tokenResult.error);
    return successResponse({ 
      needs_reauth: true, 
      reason: tokenResult.error || "token_error" 
    });
  }

  return successResponse({ 
    access_token: tokenResult.accessToken,
    is_premium: tokenResult.isPremium ?? false
  });
}