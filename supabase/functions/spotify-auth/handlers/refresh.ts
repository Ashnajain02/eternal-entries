
import { corsHeaders } from "../utils/corsHeaders.ts";
import { createErrorResponse, createSuccessResponse } from "../utils/responseHelpers.ts";

export async function handleRefresh(supabase, params, userId, clientId, clientSecret) {
  try {
    // Use the userId from params if provided, otherwise fall back to token user
    const userIdToCheck = params.user_id || userId;
    
    // Get the user's refresh token
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("spotify_refresh_token")
      .eq("id", userIdToCheck)
      .single();
    
    if (profileError) {
      console.error("Error fetching refresh token:", profileError);
      return createErrorResponse(500, "Failed to fetch refresh token", profileError.message);
    }
    
    if (!profile?.spotify_refresh_token) {
      console.error("No refresh token found for user");
      return createErrorResponse(400, "No refresh token found");
    }
    
    // Refresh the access token
    const refreshResponse = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: profile.spotify_refresh_token,
      }),
    });
    
    if (!refreshResponse.ok) {
      console.error("Refresh token error:", refreshResponse.status);
      let errorText = "";
      try {
        errorText = await refreshResponse.text();
      } catch (e) {
        errorText = "Could not read error response";
      }
      return createErrorResponse(refreshResponse.status, "Failed to refresh token", errorText);
    }
    
    const tokenData = await refreshResponse.json();
    
    // Calculate token expiration
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + tokenData.expires_in);
    
    // Update the tokens in the user's profile
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        spotify_access_token: tokenData.access_token,
        // Some refresh token responses don't include a new refresh token
        ...(tokenData.refresh_token && { spotify_refresh_token: tokenData.refresh_token }),
        spotify_token_expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq("id", userIdToCheck);
    
    if (updateError) {
      console.error("Error updating tokens:", updateError);
      return createErrorResponse(500, "Failed to update tokens", updateError.message);
    }
    
    return createSuccessResponse({ 
      success: true,
      access_token: tokenData.access_token,
      expires_at: expiresAt.toISOString()
    });
  } catch (refreshError) {
    console.error("General error refreshing token:", refreshError);
    return createErrorResponse(500, "Error refreshing token", refreshError.message);
  }
}
