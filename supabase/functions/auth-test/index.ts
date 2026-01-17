
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
