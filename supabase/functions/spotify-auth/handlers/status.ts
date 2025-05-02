
import { corsHeaders } from "../utils/corsHeaders.ts";
import { createErrorResponse, createSuccessResponse } from "../utils/responseHelpers.ts";

export async function handleStatus(supabase, params, userId) {
  try {
    // Use the userId from params if provided, otherwise fall back to token user
    const userIdToCheck = params.user_id || userId;
    
    console.log("Checking Spotify status for user:", userIdToCheck);
    
    // Get the user's Spotify connection status
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("spotify_username, spotify_token_expires_at, spotify_access_token")
      .eq("id", userIdToCheck)
      .maybeSingle();
    
    if (profileError) {
      console.error("Error getting profile for status check:", profileError);
      return createErrorResponse(500, "Failed to get profile", profileError.message);
    }
    
    if (!profile) {
      console.log("No profile found for user:", userIdToCheck);
      
      try {
        // Try to create a profile for the user
        const { error: createError } = await supabase
          .from("profiles")
          .insert({ id: userIdToCheck });
          
        if (createError) {
          console.error("Error creating profile:", createError);
          
          // Try to use the RPC function as fallback
          console.log("Attempting to use RPC function as fallback for profile creation");
          const { error: rpcError } = await supabase.rpc(
            "update_profile_spotify_data",
            {
              p_user_id: userIdToCheck,
              p_access_token: '',
              p_refresh_token: '',
              p_expires_at: new Date().toISOString(),
              p_username: ''
            }
          );
          
          if (rpcError) {
            console.error("RPC creation fallback also failed:", rpcError);
          } else {
            console.log("Successfully created profile using RPC function");
          }
        } else {
          console.log("Created new profile for user");
        }
      } catch (createError) {
        console.error("Exception during profile creation:", createError);
      }
      
      return createSuccessResponse({
        connected: false,
        expired: false,
        username: null,
        profile_exists: false
      });
    }
    
    console.log("Retrieved profile data:", {
      has_username: !!profile?.spotify_username,
      has_token: !!profile?.spotify_access_token,
      expires_at: profile?.spotify_token_expires_at
    });
    
    const isConnected = !!profile?.spotify_username && !!profile?.spotify_access_token;
    const isExpired = profile?.spotify_token_expires_at ? new Date(profile.spotify_token_expires_at) < new Date() : true;
    
    return createSuccessResponse({
      connected: isConnected,
      expired: isConnected && isExpired,
      username: profile?.spotify_username || null,
      profile_exists: true
    });
  } catch (statusError) {
    console.error("General error checking status:", statusError);
    return createErrorResponse(500, "Error checking status", statusError.message);
  }
}
