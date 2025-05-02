
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  console.log("Auth test function invoked");
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log("Handling CORS preflight request");
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    // Check environment
    console.log("Environment check on startup:");
    console.log(`SUPABASE_URL available: ${!!Deno.env.get("SUPABASE_URL")}`);
    console.log(`SUPABASE_ANON_KEY available: ${!!Deno.env.get("SUPABASE_ANON_KEY")}`);
    console.log(`SUPABASE_SERVICE_ROLE_KEY available: ${!!Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`);

    // Get the auth token from the request
    console.log("Auth header present:", !!req.headers.get("Authorization"));
    
    const authHeader = req.headers.get("Authorization") || "";
    console.log("Raw auth header:", authHeader);
    
    // Extract the token part (removes "Bearer " prefix if present)
    const token = authHeader.replace(/^Bearer\s/, "").trim();
    console.log(`Token extracted, length: ${token.length}`);
    console.log(`Token first 20 chars: ${token.substring(0, 20)}...`);
    
    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get user data from token
    console.log("Attempting to get user from token");
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError) {
      console.error(`Failed to get user: ${userError.message}`);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to verify token: " + userError.message,
          tokenInfo: {
            length: token.length,
            preview: token.substring(0, 10) + "..."
          }
        }),
        { 
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        }
      );
    }

    if (!user) {
      console.error("No user found for the provided token");
      return new Response(
        JSON.stringify({
          success: false,
          error: "Auth session missing!",
          tokenInfo: {
            length: token.length,
            preview: token.substring(0, 10) + "..."
          }
        }),
        { 
          status: 401, 
          headers: { "Content-Type": "application/json", ...corsHeaders }
        }
      );
    }

    console.log(`User authenticated successfully: ${user.id}`);

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
    console.error(`Unexpected error: ${error.message}`);
    return new Response(
      JSON.stringify({
        success: false,
        error: `Server error: ${error.message}`
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      }
    );
  }
});
