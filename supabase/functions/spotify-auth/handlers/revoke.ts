
import { corsHeaders } from "../utils/corsHeaders.ts";
import { createErrorResponse, createSuccessResponse } from "../utils/responseHelpers.ts";

export async function handleRevoke(supabase, params, userId) {
  try {
    // Use the userId from params if provided, otherwise fall back to token user
    const userIdToCheck = params.user_id || userId;
    
    if (!userIdToCheck) {
      return createErrorResponse(400, "No user ID provided");
    }
    
    // Clear Spotify data from the user's profile
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        spotify_access_token: null,
        spotify_refresh_token: null,
        spotify_token_expires_at: null,
        spotify_username: null,
        updated_at: new Date().toISOString()
      })
      .eq("id", userIdToCheck);
    
    if (updateError) {
      console.error("Error clearing Spotify data:", updateError);
      return createErrorResponse(500, "Failed to clear Spotify data", updateError.message);
    }
    
    return createSuccessResponse({ success: true });
  } catch (revokeError) {
    console.error("Error disconnecting from Spotify:", revokeError);
    return createErrorResponse(500, "Error disconnecting from Spotify", revokeError.message);
  }
}
