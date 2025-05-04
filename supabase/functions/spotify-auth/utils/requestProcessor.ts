import { corsHeaders } from "./corsHeaders.ts";

export async function processRequest(req, supabase) {
  const authHeader = req.headers.get("Authorization");
  console.log("Auth header present:", !!authHeader);
  
  let userId = null;
  let verifiedUser = null;
  let action = null;
  let params = {};

  const contentType = req.headers.get("content-type") || "";

  try {
    if (contentType.includes("application/json")) {
      const body = await req.json();
      console.log("Request body:", JSON.stringify(body));

      action = body.action?.toString();
      userId = body.user_id?.toString() || null;

      // Ensure `params` contains only relevant data (not `action` or `user_id`)
      params = { ...body };
      delete params.action;
      delete params.user_id;

      console.log("Parsed action:", action);
      console.log("Parsed user_id:", userId);
      console.log("Parsed params:", params);

    } else {
      // Fallback for URL-based queries
      const url = new URL(req.url);
      action = url.pathname.split("/").pop();
      params = Object.fromEntries(url.searchParams);

      userId = params.user_id || null;
      console.log("URL fallback action:", action);
    }
  } catch (parseError) {
    console.error("Error parsing request body:", parseError);
    throw new Error(`Invalid request format: ${parseError.message}`);
  }

  if (authHeader) {
    const token = authHeader.replace("Bearer ", "");
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser(token);

      if (userData?.user) {
        verifiedUser = userData.user;
        if (!userId) {
          userId = verifiedUser.id;
        }
        console.log("Verified user ID:", verifiedUser.id);
      } else if (userError) {
        console.warn("Token verification failed:", userError.message);
      }
    } catch (authError) {
      console.error("Exception during token verification:", authError);
    }
  }

  return { action, params, userId, verifiedUser };
}
