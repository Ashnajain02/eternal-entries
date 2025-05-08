
import { corsHeaders } from "../utils/corsHeaders.ts";
import { createErrorResponse, createSuccessResponse } from "../utils/responseHelpers.ts";
import { ensureProfile } from "../utils/supabase.ts";

export async function handleCallback(supabase, params, userId, clientId, clientSecret) {
  // Handle the OAuth callback from Spotify
  const code = params.code;
  // Get the redirect_uri that was used for the original authorization request
  const redirect_uri = params.redirect_uri;
  
  console.log("Callback request params:", { 
    codePresent: !!code, 
    codeLength: code ? code.length : 0,
    redirect_uri,
    userId: userId
  });
  
  if (!code) {
    console.error("No authorization code provided for callback");
    return createErrorResponse(400, "No authorization code provided");
  }
  
  // Use the provided redirect_uri or fallback to constructing one
  const redirectUri = redirect_uri || `${new URL(req.url).origin}/spotify-callback`;
  
  console.log("Using redirect URI for token exchange:", redirectUri);
  console.log("Client credentials available:", { 
    clientIdLength: clientId.length,
    clientSecretLength: clientSecret ? clientSecret.length : 0
  });
  
  try {
    // Ensure the profile exists
    const profileCreated = await ensureProfile(supabase, userId);
    if (!profileCreated) {
      return createErrorResponse(500, "Failed to create or verify user profile");
    }
  
    // Exchange the code for an access token
    console.log("Sending token exchange request to Spotify API...");
    try {
      const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Authorization": `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: redirectUri,
        }),
      });
      
      console.log("Token exchange response status:", tokenResponse.status);
      
      if (!tokenResponse.ok) {
        console.error("Token exchange error status:", tokenResponse.status);
        let errorBody = "";
        try {
          errorBody = await tokenResponse.text();
          console.error("Token exchange error body:", errorBody);
          
          // Try to parse as JSON if possible
          try {
            const errorJson = JSON.parse(errorBody);
            return createErrorResponse(
              400, 
              errorJson.error || "Token exchange failed", 
              {
                error_description: errorJson.error_description,
                redirect_uri: redirectUri,
                code_length: code.length,
                status: tokenResponse.status
              }
            );
          } catch {
            // If not JSON, return the text
            return createErrorResponse(
              400, 
              "Token exchange failed", 
              `Status: ${tokenResponse.status}, Response: ${errorBody.substring(0, 100)}...`
            );
          }
        } catch (responseReadError) {
          console.error("Error reading token exchange response:", responseReadError);
          return createErrorResponse(500, "Error reading token exchange response", responseReadError.message);
        }
      }
      
      let tokenData;
      try {
        tokenData = await tokenResponse.json();
      } catch (tokenJsonError) {
        console.error("Error parsing token response JSON:", tokenJsonError);
        return createErrorResponse(500, "Error parsing token response", tokenJsonError.message);
      }
      
      if (tokenData.error) {
        console.error("Token exchange error:", tokenData);
        return createErrorResponse(
          400, 
          tokenData.error, 
          {
            error_description: tokenData.error_description,
            redirect_uri: redirectUri, 
            code_length: code.length
          }
        );
      }
      
      console.log("Token exchange successful. Got tokens:", {
        access_token_present: !!tokenData.access_token,
        refresh_token_present: !!tokenData.refresh_token,
        expires_in: tokenData.expires_in
      });
      
      try {
        // Get the user's Spotify profile
        console.log("Fetching Spotify user profile...");
        const profileResponse = await fetch("https://api.spotify.com/v1/me", {
          headers: {
            "Authorization": `Bearer ${tokenData.access_token}`,
          },
        });
        
        if (!profileResponse.ok) {
          console.error("Profile fetch error status:", profileResponse.status);
          let profileErrorText = "";
          try {
            profileErrorText = await profileResponse.text();
          } catch (e) {
            profileErrorText = "Could not read error response";
          }
          console.error("Profile fetch error text:", profileErrorText);
          return createErrorResponse(
            profileResponse.status, 
            "Failed to fetch profile", 
            `Status: ${profileResponse.status}, Response: ${profileErrorText}`
          );
        }
        
        let profileData;
        try {
          profileData = await profileResponse.json();
        } catch (profileJsonError) {
          console.error("Error parsing profile response JSON:", profileJsonError);
          return createErrorResponse(500, "Error parsing profile response", profileJsonError.message);
        }
        
        console.log("Got Spotify profile:", {
          id: profileData.id,
          display_name: profileData.display_name,
          email: profileData.email
        });
        
        // Calculate token expiration
        const expiresAt = new Date();
        expiresAt.setSeconds(expiresAt.getSeconds() + tokenData.expires_in);
        
        // Save the tokens using RPC function
        let profileUpdateSuccess = await updateProfileWithSpotifyData(
          supabase,
          userId,
          tokenData.access_token,
          tokenData.refresh_token || "",
          expiresAt.toISOString(),
          profileData.display_name || profileData.id
        );
        
        if (!profileUpdateSuccess) {
          return createErrorResponse(500, "Failed to save Spotify data to database after multiple attempts");
        }
        
        return createSuccessResponse({ 
          success: true,
          display_name: profileData.display_name,
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          expires_at: expiresAt.toISOString()
        });
      } catch (profileError) {
        console.error("Error fetching or saving profile data:", profileError);
        return createErrorResponse(500, "Failed to process profile data", profileError.message);
      }
    } catch (tokenFetchError) {
      console.error("Error fetching token from Spotify:", tokenFetchError);
      return createErrorResponse(500, "Error fetching token from Spotify", tokenFetchError.message);
    }
  } catch (tokenError) {
    console.error("Error during token exchange process:", tokenError);
    return createErrorResponse(500, "Error during token exchange", tokenError.message);
  }
}

// Helper function to update profile with various fallback mechanisms
async function updateProfileWithSpotifyData(
  supabase,
  userId,
  accessToken,
  refreshToken,
  expiresAt,
  username
) {
  // First, try using the function we created for reliability
  let profileUpdateSuccess = false;
  
  try {
    console.log("Attempting to update profile data using RPC function...");
    const { data: rpcResult, error: rpcError } = await supabase.rpc(
      "update_profile_spotify_data",
      {
        p_user_id: userId,
        p_access_token: accessToken,
        p_refresh_token: refreshToken,
        p_expires_at: expiresAt,
        p_username: username
      }
    );
    
    if (rpcError) {
      console.error("RPC function error:", rpcError);
      // Continue to fallback methods
    } else {
      console.log("RPC function update result:", rpcResult);
      if (rpcResult === true) {
        console.log("Profile updated successfully via RPC function!");
        profileUpdateSuccess = true;
      }
    }
  } catch (rpcCallError) {
    console.error("Error calling RPC function:", rpcCallError);
    // Continue to fallback methods
  }
  
  // Try direct update as fallback 1 if RPC failed
  if (!profileUpdateSuccess) {
    console.log("Attempting direct update as fallback...");
    try {
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          spotify_access_token: accessToken,
          spotify_refresh_token: refreshToken,
          spotify_token_expires_at: expiresAt,
          spotify_username: username,
          updated_at: new Date().toISOString()
        })
        .eq("id", userId);
      
      if (updateError) {
        console.error("Error updating profile with direct update:", updateError);
      } else {
        console.log("Direct update completed successfully");
        profileUpdateSuccess = true;
      }
    } catch (directUpdateError) {
      console.error("Direct update failed:", directUpdateError);
    }
  }
  
  // Try upsert as fallback 2 if both RPC and direct update failed
  if (!profileUpdateSuccess) {
    console.log("Attempting upsert as second fallback...");
    try {
      const { error: upsertError } = await supabase
        .from("profiles")
        .upsert({
          id: userId,
          spotify_access_token: accessToken,
          spotify_refresh_token: refreshToken,
          spotify_token_expires_at: expiresAt,
          spotify_username: username,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'id'
        });
        
      if (upsertError) {
        console.error("Upsert fallback failed:", upsertError);
      } else {
        console.log("Upsert completed successfully");
        profileUpdateSuccess = true;
      }
    } catch (upsertCatchError) {
      console.error("Upsert try-catch failed:", upsertCatchError);
    }
  }
  
  // Final verification to make sure the data was actually saved
  try {
    const { data: finalVerifyData, error: finalVerifyError } = await supabase
      .from("profiles")
      .select("spotify_username, spotify_access_token")
      .eq("id", userId)
      .single();
      
    if (finalVerifyError) {
      console.error("Error in final verification:", finalVerifyError);
    } else {
      console.log("Final verification result:", {
        hasUsername: !!finalVerifyData?.spotify_username,
        hasToken: !!finalVerifyData?.spotify_access_token,
        username: finalVerifyData?.spotify_username
      });
      
      if (!finalVerifyData?.spotify_access_token || !finalVerifyData?.spotify_username) {
        console.error("Critical error: Data still not saved after all attempts!");
        profileUpdateSuccess = false;
      } else {
        profileUpdateSuccess = true;
      }
    }
  } catch (verifyError) {
    console.error("Error during verification:", verifyError);
  }
  
  return profileUpdateSuccess;
}
