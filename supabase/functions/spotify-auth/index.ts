
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "./utils/corsHeaders.ts";
import { handleSearch } from "./handlers/search.ts";
import { handleAuthorize } from "./handlers/authorize.ts";
import { handleCallback } from "./handlers/callback.ts";
import { handleStatus } from "./handlers/status.ts";
import { handleRefresh } from "./handlers/refresh.ts";
import { handleRevoke } from "./handlers/revoke.ts";
import { createSupabaseClient, getEnvironmentVariables } from "./utils/supabase.ts";
import { processRequest } from "./utils/requestProcessor.ts";

// Log environment variables availability on startup
const env = getEnvironmentVariables();
console.log("Environment check on startup:");
console.log("SUPABASE_URL available:", !!env.supabaseUrl);
console.log("SUPABASE_ANON_KEY available:", !!env.supabaseAnonKey);
console.log("SPOTIFY_CLIENT_ID available:", !!env.clientId);
console.log("SPOTIFY_CLIENT_SECRET available:", !!env.clientSecret);

// Create a Supabase client for the function
const supabase = createSupabaseClient(env.supabaseUrl, env.supabaseAnonKey);

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    console.log("Handling CORS preflight request");
    return new Response(null, { headers: corsHeaders, status: 204 });
  }
  
  try {
    // Process the request to extract auth, action, and parameters
    const { action, params, userId, verifiedUser } = await processRequest(req, supabase);
    
    // If no action provided, return error
    if (!action) {
      console.error("No action specified in request");
      return new Response(
        JSON.stringify({ error: "No action specified" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }
    
    // Route to appropriate handler based on action
    switch (action) {
      case "search":
        return await handleSearch(supabase, params, userId);
        
      case "authorize":
        return await handleAuthorize(params, env.clientId);
        
      case "callback":
        return await handleCallback(supabase, params, userId, env.clientId, env.clientSecret);
        
      case "status":
        return await handleStatus(supabase, params, userId);
        
      case "refresh":
        return await handleRefresh(supabase, params, userId, env.clientId, env.clientSecret);
        
      case "revoke":
        return await handleRevoke(supabase, params, userId);
        
      default:
        // If we reach here, the action wasn't recognized
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
    }
  } catch (err) {
    console.error("Unhandled error in edge function:", err);
    
    return new Response(
      JSON.stringify({ 
        error: "Unhandled error in edge function", 
        details: err.message,
        stack: err.stack
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
