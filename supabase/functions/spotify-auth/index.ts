
// This function is no longer used but kept as a placeholder
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "./utils/corsHeaders.ts";

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }
  
  return new Response(
    JSON.stringify({ message: "This endpoint has been deprecated" }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
  );
});
