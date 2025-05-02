
import { corsHeaders } from "./corsHeaders.ts";

// Helper function to create error responses
export function createErrorResponse(status: number, message: string, details?: any) {
  return new Response(
    JSON.stringify({ 
      error: message, 
      details: details 
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" }, status }
  );
}

// Helper function to create success responses
export function createSuccessResponse(data: any) {
  return new Response(
    JSON.stringify(data),
    { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
  );
}
