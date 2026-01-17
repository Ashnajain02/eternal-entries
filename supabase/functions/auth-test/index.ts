import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
  'https://eternal-entries.lovable.app',
  'https://veorhexddrwlwxtkuycb.supabase.co',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:8080',
];

// Get CORS headers with origin validation
function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigin = origin && ALLOWED_ORIGINS.some(allowed => 
    origin === allowed || origin.endsWith('.lovable.app')
  ) ? origin : ALLOWED_ORIGINS[0];
  
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

serve(async (req: Request) => {
  console.log("Auth test function invoked");
  const origin = req.headers.get("Origin");
  const corsHeaders = getCorsHeaders(origin);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    // Get the auth token from the request
    const authHeader = req.headers.get("Authorization") || "";
    
    // Extract the token part (removes "Bearer " prefix if present)
    const token = authHeader.replace(/^Bearer\s/, "").trim();
    
    if (!token) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Authorization token required"
        }),
        { 
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        }
      );
    }
    
    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing Supabase configuration");
      return new Response(
        JSON.stringify({
          success: false,
          error: "Server configuration error"
        }),
        { 
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get user data from token
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError) {
      console.error("Token verification failed");
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid or expired token"
        }),
        { 
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        }
      );
    }

    if (!user) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "User not found"
        }),
        { 
          status: 401, 
          headers: { "Content-Type": "application/json", ...corsHeaders }
        }
      );
    }

    console.log("User authenticated successfully");

    // Return success with user data
    return new Response(
      JSON.stringify({
        success: true,
        message: "Authentication successful!",
        user: {
          id: user.id,
          email: user.email,
        }
      }),
      {
        headers: { "Content-Type": "application/json", ...corsHeaders }
      }
    );

  } catch (error) {
    console.error("Unexpected error in auth-test");
    return new Response(
      JSON.stringify({
        success: false,
        error: "Server error"
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      }
    );
  }
});
