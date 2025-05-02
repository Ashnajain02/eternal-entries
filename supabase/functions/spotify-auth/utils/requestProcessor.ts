
import { corsHeaders } from "./corsHeaders.ts";

// Process the incoming request to extract user, action, and parameters
export async function processRequest(req, supabase) {
  // Extract authentication data
  const authHeader = req.headers.get("Authorization");
  console.log("Auth header present:", !!authHeader);
  
  // Initialize variables
  let userId = null;
  let verifiedUser = null;
  let action, params;
  
  // Parse request body to get the action and parameters
  const contentType = req.headers.get("content-type") || "";
  
  try {
    if (contentType.includes("application/json")) {
      const body = await req.json();
      console.log("Request body:", JSON.stringify(body));
      action = body.action;
      params = body;
      
      // Use user_id from request body if available
      if (body.user_id) {
        userId = body.user_id;
        console.log("Using user_id from request body:", userId);
      }
    } else {
      // For backward compatibility with URL-based params
      const url = new URL(req.url);
      action = url.pathname.split("/").pop();
      params = Object.fromEntries(url.searchParams);
      
      // Use user_id from URL params if available
      if (params.user_id) {
        userId = params.user_id;
        console.log("Using user_id from URL params:", userId);
      }
    }
    
    console.log(`Request to ${action || 'unknown'} endpoint with params:`, params);
  } catch (parseError) {
    console.error("Error parsing request body:", parseError);
    throw new Error(`Invalid request format: ${parseError.message}`);
  }
  
  // If authHeader is present, try to extract user from it
  if (authHeader) {
    const token = authHeader.replace("Bearer ", "");
    console.log("Token extracted, length:", token.length);
    
    try {
      // Attempt to get user but don't require it to succeed
      const { data: userData, error: userError } = await supabase.auth.getUser(token);
      
      if (userError) {
        console.error("Failed to verify token:", userError.message);
        console.log("Proceeding anyway with the request...");
      }
      
      if (userData?.user) {
        console.log("Successfully verified user from token:", userData.user.id);
        verifiedUser = userData.user;
        // If we don't have userId yet, use the one from the token
        if (!userId) {
          userId = userData.user.id;
          console.log("Using user_id from token:", userId);
        }
      } else {
        console.log("Token verification succeeded but no user was returned");
      }
    } catch (authError) {
      console.error("Exception during token verification:", authError);
      console.log("Continuing despite token verification failure");
    }
  }
  
  return { action, params, userId, verifiedUser };
}
