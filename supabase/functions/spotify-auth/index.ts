import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
const clientId = Deno.env.get("SPOTIFY_CLIENT_ID") || "";
const clientSecret = Deno.env.get("SPOTIFY_CLIENT_SECRET") || "";

console.log("Environment check on startup:");
console.log("SUPABASE_URL available:", !!supabaseUrl);
console.log("SUPABASE_ANON_KEY available:", !!supabaseAnonKey);
console.log("SPOTIFY_CLIENT_ID available:", !!clientId);
console.log("SPOTIFY_CLIENT_SECRET available:", !!clientSecret);

// Create a Supabase client for the function
const supabase = createClient(supabaseUrl, supabaseAnonKey);

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }
  
  try {
    // Get the token from the request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("No authorization header provided");
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }
    
    const token = authHeader.replace("Bearer ", "");
    
    // Verify the JWT token
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      console.error("Unauthorized request:", userError?.message);
      return new Response(
        JSON.stringify({ error: "Unauthorized", details: userError?.message }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    // Parse request body to get the action and parameters
    let action, params;
    const contentType = req.headers.get("content-type") || "";
    
    if (contentType.includes("application/json")) {
      try {
        const body = await req.json();
        action = body.action;
        params = body;
        console.log(`Request to ${action} endpoint with params:`, params);
      } catch (parseError) {
        console.error("Error parsing JSON body:", parseError);
        return new Response(
          JSON.stringify({ error: "Invalid JSON body" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }
    } else {
      // For backward compatibility with URL-based params
      const url = new URL(req.url);
      action = url.pathname.split("/").pop();
      params = Object.fromEntries(url.searchParams);
      console.log(`URL-based request to ${action} endpoint with params:`, params);
    }
    
    // If user_id is provided in params, use it for verification
    const userId = params.user_id || user.id;
    if (params.user_id && params.user_id !== user.id) {
      console.warn(`User ID mismatch: ${params.user_id} (param) vs ${user.id} (token)`);
    }
    
    // Special endpoint to get tokens for a user (for verification purposes only)
    if (action === "get_tokens_for_userid") {
      try {
        const userIdToCheck = params.user_id || user.id;
        
        if (userIdToCheck !== user.id && !user.app_metadata?.admin) {
          return new Response(
            JSON.stringify({ error: "Unauthorized access" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
          );
        }
        
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("spotify_access_token, spotify_refresh_token, spotify_token_expires_at")
          .eq("id", userIdToCheck)
          .maybeSingle();
          
        if (profileError) {
          console.error("Error fetching tokens:", profileError);
          return new Response(
            JSON.stringify({ error: "Failed to fetch tokens", details: profileError.message }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
          );
        }
        
        if (!profile || !profile.spotify_access_token) {
          return new Response(
            JSON.stringify({ error: "No tokens found" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
          );
        }
        
        // Calculate expires_in from expires_at
        let expires_in = 3600; // Default 1 hour
        if (profile.spotify_token_expires_at) {
          const expiresAt = new Date(profile.spotify_token_expires_at);
          const now = new Date();
          expires_in = Math.floor((expiresAt.getTime() - now.getTime()) / 1000);
          if (expires_in < 0) expires_in = 0;
        }
        
        return new Response(
          JSON.stringify({
            access_token: profile.spotify_access_token,
            refresh_token: profile.spotify_refresh_token,
            expires_in
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      } catch (error) {
        console.error("Error in get_tokens_for_userid:", error);
        return new Response(
          JSON.stringify({ error: "Internal server error", details: error.message }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
        );
      }
    }
    
    // Authorize endpoint - provide proper Spotify authorization URL
    else if (action === "authorize") {
      const redirect_uri = params.redirect_uri;
      const scope = params.scope;
      const show_dialog = params.show_dialog === "true";
      
      console.log("Auth request params:", { redirect_uri, scope, show_dialog });
      
      if (!redirect_uri || !scope) {
        console.error("Missing required parameters for authorize endpoint");
        return new Response(
          JSON.stringify({ error: "Missing required parameters" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }
      
      if (!clientId) {
        console.error("Spotify Client ID is not configured");
        return new Response(
          JSON.stringify({ error: "Spotify Client ID is not configured" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
        );
      }
      
      // Generate the authorization URL with the proper client ID
      console.log("Client ID type:", typeof clientId);
      console.log("Client ID length:", clientId.length);
      console.log("First 5 chars of Client ID:", clientId.substring(0, 5));
      
      const authUrl = `https://accounts.spotify.com/authorize?client_id=${encodeURIComponent(clientId)}&response_type=code&redirect_uri=${encodeURIComponent(
        redirect_uri
      )}&scope=${encodeURIComponent(scope)}${show_dialog ? "&show_dialog=true" : ""}`;
      
      console.log("Generated auth URL:", authUrl);
      
      return new Response(
        JSON.stringify({ url: authUrl }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }
    
    // Callback endpoint - exchange code for tokens
    else if (action === "callback") {
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
        return new Response(
          JSON.stringify({ error: "No authorization code provided" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }
      
      // Use the provided redirect_uri or fallback to constructing one
      const redirectUri = redirect_uri || `${new URL(req.url).origin}/spotify-callback`;
      
      console.log("Using redirect URI for token exchange:", redirectUri);
      console.log("Client credentials available:", { 
        clientIdLength: clientId.length,
        clientSecretLength: clientSecret ? clientSecret.length : 0
      });
      
      try {
        // First, check if the profile exists
        const { data: profileData, error: profileCheckError } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", userId)
          .maybeSingle();
          
        if (profileCheckError) {
          console.error("Error checking if profile exists:", profileCheckError);
        } else if (!profileData) {
          console.log(`Profile does not exist for user ${userId}, creating one`);
          const { error: createProfileError } = await supabase
            .from("profiles")
            .insert({ id: userId });
            
          if (createProfileError) {
            console.error("Failed to create profile:", createProfileError);
            return new Response(
              JSON.stringify({ 
                error: "Failed to create user profile", 
                details: createProfileError.message 
              }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
            );
          } else {
            console.log("Successfully created profile for user");
          }
        }
      
        // Exchange the code for an access token
        console.log("Sending token exchange request to Spotify API...");
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
          const errorText = await tokenResponse.text();
          console.error("Token exchange error body:", errorText);
          
          try {
            // Try to parse as JSON if possible
            const errorJson = JSON.parse(errorText);
            return new Response(
              JSON.stringify({ 
                error: errorJson.error || "Token exchange failed", 
                error_description: errorJson.error_description,
                details: `Redirect URI: ${redirectUri}, Code length: ${code.length}, Status: ${tokenResponse.status}`
              }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
            );
          } catch {
            // If not JSON, return the text
            return new Response(
              JSON.stringify({ 
                error: "Token exchange failed", 
                details: `Status: ${tokenResponse.status}, Response: ${errorText.substring(0, 100)}...`
              }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
            );
          }
        }
        
        const tokenData = await tokenResponse.json();
        
        if (tokenData.error) {
          console.error("Token exchange error:", tokenData);
          return new Response(
            JSON.stringify({ 
              error: tokenData.error, 
              error_description: tokenData.error_description,
              details: `Redirect URI: ${redirectUri}, Code length: ${code.length}`
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
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
            const profileErrorText = await profileResponse.text();
            console.error("Profile fetch error text:", profileErrorText);
            throw new Error(`Failed to fetch profile: ${profileResponse.status}`);
          }
          
          const profileData = await profileResponse.json();
          
          console.log("Got Spotify profile:", {
            id: profileData.id,
            display_name: profileData.display_name,
            email: profileData.email
          });
          
          // Calculate token expiration
          const expiresAt = new Date();
          expiresAt.setSeconds(expiresAt.getSeconds() + tokenData.expires_in);
          
          // Save the tokens in the user's profile
          console.log("Updating profile record in database for user:", userId);
          console.log("With data:", {
            spotify_access_token: "PRESENT",
            spotify_refresh_token: "PRESENT",
            spotify_token_expires_at: expiresAt.toISOString(),
            spotify_username: profileData.display_name || profileData.id
          });
          
          // Try using the dedicated RPC function first - more reliable
          try {
            console.log("Attempting to update via RPC function...");
            const { data: rpcResult, error: rpcError } = await supabase.rpc(
              "update_profile_spotify_data",
              {
                p_user_id: userId,
                p_access_token: tokenData.access_token,
                p_refresh_token: tokenData.refresh_token,
                p_expires_at: expiresAt.toISOString(),
                p_username: profileData.display_name || profileData.id
              }
            );
            
            if (rpcError) {
              console.error("RPC function error:", rpcError);
              // Continue to regular update as fallback
            } else {
              console.log("RPC function result:", rpcResult);
              if (rpcResult) {
                // RPC update successful, proceed to verification and return
                // ... continue with verification and response
              } else {
                console.error("RPC update returned false, falling back to standard update");
              }
            }
          } catch (rpcCallError) {
            console.error("Error calling RPC function:", rpcCallError);
            // Continue to regular update
          }
          
          // Traditional update as fallback
          const { data: updateData, error: updateError } = await supabase
            .from("profiles")
            .update({
              spotify_access_token: tokenData.access_token,
              spotify_refresh_token: tokenData.refresh_token,
              spotify_token_expires_at: expiresAt.toISOString(),
              spotify_username: profileData.display_name || profileData.id,
            })
            .eq("id", userId);
        
          if (updateError) {
            console.error("Error updating profile:", updateError);
            
            // Check if row exists by doing a select
            const { data: existingProfile, error: selectError } = await supabase
              .from("profiles")
              .select("id")
              .eq("id", userId)
              .maybeSingle();
              
            if (selectError) {
              console.error("Error checking profile existence:", selectError);
            } else {
              console.log("Profile exists for user:", !!existingProfile);
              
              if (!existingProfile) {
                // Try to insert a new profile if it doesn't exist
                console.log("Attempting to insert new profile for user:", userId);
                const { error: insertError } = await supabase
                  .from("profiles")
                  .insert({
                    id: userId,
                    spotify_access_token: tokenData.access_token,
                    spotify_refresh_token: tokenData.refresh_token,
                    spotify_token_expires_at: expiresAt.toISOString(),
                    spotify_username: profileData.display_name || profileData.id,
                  });
                  
                if (insertError) {
                  console.error("Error inserting new profile:", insertError);
                  return new Response(
                    JSON.stringify({ 
                      error: "Failed to create profile", 
                      details: insertError.message
                    }),
                    { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
                  );
                } else {
                  console.log("Successfully created new profile");
                }
              } else {
                return new Response(
                  JSON.stringify({ 
                    error: "Failed to update profile", 
                    details: updateError.message
                  }),
                  { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
                );
              }
            }
          } else {
            console.log("Successfully updated user profile with Spotify credentials");
          }
          
          // Do a double check to verify the profile was updated
          const { data: verifyProfile, error: verifyError } = await supabase
            .from("profiles")
            .select("spotify_username, spotify_access_token")
            .eq("id", userId)
            .single();
            
          if (verifyError) {
            console.error("Error verifying profile update:", verifyError);
          } else {
            console.log("Verification of profile update:", {
              hasUsername: !!verifyProfile?.spotify_username,
              hasToken: !!verifyProfile?.spotify_access_token,
              username: verifyProfile?.spotify_username
            });
            
            if (!verifyProfile?.spotify_username || !verifyProfile?.spotify_access_token) {
              console.error("Profile verification failed! Database update didn't take effect");
              
              // Try one more time with a direct update
              const { error: retryError } = await supabase.rpc(
                "update_profile_spotify_data",
                {
                  p_user_id: userId,
                  p_access_token: tokenData.access_token,
                  p_refresh_token: tokenData.refresh_token,
                  p_expires_at: expiresAt.toISOString(),
                  p_username: profileData.display_name || profileData.id
                }
              );
              
              if (retryError) {
                console.error("RPC update retry failed:", retryError);
              } else {
                console.log("Used RPC function for update as fallback");
              }
            }
          }
          
          return new Response(
            JSON.stringify({ 
              success: true,
              display_name: profileData.display_name,
              expires_at: expiresAt.toISOString() 
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
          );
        } catch (profileError) {
          console.error("Error fetching or saving profile data:", profileError);
          return new Response(
            JSON.stringify({ 
              error: "Failed to process profile data", 
              details: profileError.message
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
          );
        }
      } catch (tokenError) {
        console.error("Error during token exchange process:", tokenError);
        return new Response(
          JSON.stringify({ 
            error: "Error during token exchange", 
            details: tokenError.message
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
        );
      }
    }
    
    // Status endpoint - check Spotify connection status
    else if (action === "status") {
      try {
        // Use the userId from params if provided, otherwise fall back to token user
        const userIdToCheck = params.user_id || user.id;
        
        console.log("Checking Spotify status for user:", userIdToCheck);
        
        // Get the user's Spotify connection status
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("spotify_username, spotify_token_expires_at, spotify_access_token")
          .eq("id", userIdToCheck)
          .maybeSingle();
        
        if (profileError) {
          console.error("Error getting profile for status check:", profileError);
          return new Response(
            JSON.stringify({ error: "Failed to get profile", details: profileError.message }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
          );
        }
        
        if (!profile) {
          console.log("No profile found for user:", userIdToCheck);
          
          // Try to create a profile for the user
          const { error: createError } = await supabase
            .from("profiles")
            .insert({ id: userIdToCheck });
            
          if (createError) {
            console.error("Error creating profile:", createError);
          } else {
            console.log("Created new profile for user");
          }
          
          return new Response(
            JSON.stringify({
              connected: false,
              expired: false,
              username: null,
              profile_exists: false
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
          );
        }
        
        console.log("Retrieved profile data:", {
          has_username: !!profile?.spotify_username,
          has_token: !!profile?.spotify_access_token,
          expires_at: profile?.spotify_token_expires_at
        });
        
        const isConnected = !!profile?.spotify_username && !!profile?.spotify_access_token;
        const isExpired = !profile?.spotify_token_expires_at || new Date(profile.spotify_token_expires_at) < new Date();
        
        return new Response(
          JSON.stringify({
            connected: isConnected,
            expired: isConnected && isExpired,
            username: profile?.spotify_username || null,
            profile_exists: true
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      } catch (statusError) {
        console.error("General error checking status:", statusError);
        return new Response(
          JSON.stringify({ 
            error: "Error checking status", 
            details: statusError.message 
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
        );
      }
    }
    
    // Refresh endpoint - refresh tokens
    else if (action === "refresh") {
      try {
        // Use the userId from params if provided, otherwise fall back to token user
        const userIdToCheck = params.user_id || user.id;
        
        // Get the user's refresh token
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("spotify_refresh_token")
          .eq("id", userIdToCheck)
          .single();
        
        if (profileError) {
          console.error("Error fetching refresh token:", profileError);
          return new Response(
            JSON.stringify({ error: "Failed to fetch refresh token", details: profileError.message }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
          );
        }
        
        if (!profile?.spotify_refresh_token) {
          console.error("No refresh token found for user");
          return new Response(
            JSON.stringify({ error: "No refresh token found" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
          );
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
          console.error("Token refresh failed with status:", refreshResponse.status);
          const refreshErrorText = await refreshResponse.text();
          console.error("Token refresh error body:", refreshErrorText);
          return new Response(
            JSON.stringify({ 
              error: "Failed to refresh token", 
              details: `Status: ${refreshResponse.status}` 
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
          );
        }
        
        const refreshData = await refreshResponse.json();
        
        if (refreshData.error) {
          console.error("Token refresh returned error:", refreshData.error);
          return new Response(
            JSON.stringify({ error: refreshData.error }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
          );
        }
        
        // Calculate new expiration time
        const expiresAt = new Date();
        expiresAt.setSeconds(expiresAt.getSeconds() + refreshData.expires_in);
        
        // Update the tokens in the database
        const updateData = {
          spotify_access_token: refreshData.access_token,
          spotify_token_expires_at: expiresAt.toISOString(),
        };
        
        // Update refresh token if provided
        if (refreshData.refresh_token) {
          updateData.spotify_refresh_token = refreshData.refresh_token;
        }
        
        const { error: updateError } = await supabase
          .from("profiles")
          .update(updateData)
          .eq("id", userIdToCheck);
        
        if (updateError) {
          console.error("Error updating tokens in database:", updateError);
          return new Response(
            JSON.stringify({ error: "Failed to update tokens", details: updateError.message }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
          );
        }
        
        return new Response(
          JSON.stringify({ 
            access_token: refreshData.access_token,
            expires_at: expiresAt.toISOString() 
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      } catch (refreshError) {
        console.error("General error during token refresh:", refreshError);
        return new Response(
          JSON.stringify({ 
            error: "Failed to refresh token", 
            details: refreshError.message 
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
        );
      }
    }
    
    // Revoke endpoint - disconnect from Spotify
    else if (action === "revoke") {
      try {
        // Use the userId from params if provided, otherwise fall back to token user
        const userIdToCheck = params.user_id || user.id;
        
        // Revoke the Spotify access
        const { error: updateError } = await supabase
          .from("profiles")
          .update({
            spotify_access_token: null,
            spotify_refresh_token: null,
            spotify_token_expires_at: null,
            spotify_username: null,
          })
          .eq("id", userIdToCheck);
        
        if (updateError) {
          console.error("Error revoking Spotify access:", updateError);
          return new Response(
            JSON.stringify({ error: "Failed to revoke Spotify access", details: updateError.message }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
          );
        }
        
        // Verify the update
        const { data: verifyData, error: verifyError } = await supabase
          .from("profiles")
          .select("spotify_access_token")
          .eq("id", userIdToCheck)
          .single();
          
        if (verifyError) {
          console.error("Error verifying token revocation:", verifyError);
        } else {
          console.log("Revocation verification:", {
            token_cleared: verifyData.spotify_access_token === null
          });
        }
        
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      } catch (revokeError) {
        console.error("General error during token revocation:", revokeError);
        return new Response(
          JSON.stringify({ 
            error: "Failed to revoke access", 
            details: revokeError.message 
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
        );
      }
    }
    
    // Search endpoint - search Spotify tracks
    else if (action === "search") {
      try {
        // Use the userId from params if provided, otherwise fall back to token user
        const userIdToCheck = params.user_id || user.id;
        
        // Get user's Spotify token
        const { data, error: profileError } = await supabase
          .from("profiles")
          .select("spotify_access_token, spotify_token_expires_at")
          .eq("id", userIdToCheck)
          .single();
        
        if (profileError) {
          console.error("Error fetching user profile for search:", profileError);
          return new Response(
            JSON.stringify({ error: "Failed to fetch profile", details: profileError.message }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
          );
        }
        
        if (!data?.spotify_access_token) {
          console.error("No Spotify access token found for user");
          return new Response(
            JSON.stringify({ error: "Not connected to Spotify" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
          );
        }
        
        // Check if token is expired
        const isExpired = new Date(data.spotify_token_expires_at) < new Date();
        
        if (isExpired) {
          console.error("Spotify token is expired");
          return new Response(
            JSON.stringify({ error: "Token expired, please refresh" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
          );
        }
        
        // Get query parameter
        const query = params.q || "";
        
        if (!query) {
          console.error("No search query provided");
          return new Response(
            JSON.stringify({ error: "No search query provided" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
          );
        }
        
        // Search Spotify
        const searchResponse = await fetch(
          `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=10`,
          {
            headers: {
              "Authorization": `Bearer ${data.spotify_access_token}`,
            },
          }
        );
        
        if (!searchResponse.ok) {
          console.error("Spotify search API returned status:", searchResponse.status);
          
          if (searchResponse.status === 401) {
            // Try refresh flow if possible
            try {
              const refreshResult = await refreshAndRetrySearch(userIdToCheck, query);
              return new Response(
                JSON.stringify({ tracks: refreshResult }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
              );
            } catch (refreshError) {
              console.error("Refresh and retry search failed:", refreshError);
              return new Response(
                JSON.stringify({ 
                  error: "Authentication failed, please reconnect to Spotify",
                  details: refreshError.message
                }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
              );
            }
          }
          
          const searchErrorText = await searchResponse.text();
          console.error("Search error response:", searchErrorText);
          
          try {
            const searchErrorJson = JSON.parse(searchErrorText);
            return new Response(
              JSON.stringify({ error: searchErrorJson.error?.message || "Search failed" }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: searchResponse.status }
            );
          } catch {
            return new Response(
              JSON.stringify({ error: "Search failed", details: `Status: ${searchResponse.status}` }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
            );
          }
        }
        
        const searchData = await searchResponse.json();
        
        if (!searchData?.tracks?.items) {
          console.error("Unexpected search response format:", searchData);
          return new Response(
            JSON.stringify({ error: "Invalid search response" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
          );
        }
        
        // Transform the response to match our app's format
        const tracks = searchData.tracks.items.map((track) => ({
          id: track.id,
          name: track.name,
          artist: track.artists.map((a) => a.name).join(", "),
          album: track.album.name,
          albumArt: track.album.images[0]?.url || "",
          uri: track.uri,
        }));
        
        return new Response(
          JSON.stringify({ tracks }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      } catch (searchError) {
        console.error("General error during search:", searchError);
        return new Response(
          JSON.stringify({ 
            error: "Search error", 
            details: searchError.message 
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
        );
      }
    }
    
    // Invalid endpoint
    else {
      console.error("Invalid action requested:", action);
      return new Response(
        JSON.stringify({ error: "Invalid action" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }
  } catch (error) {
    console.error("Unhandled error in edge function:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

// Helper function to refresh token and retry search
async function refreshAndRetrySearch(userId: string, query: string): Promise<any[]> {
  console.log("Attempting token refresh and search retry for user:", userId);
  
  // Get refresh token
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("spotify_refresh_token")
    .eq("id", userId)
    .single();
  
  if (profileError || !profile?.spotify_refresh_token) {
    console.error("No refresh token available:", profileError?.message);
    throw new Error("No refresh token available");
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
    const refreshErrorText = await refreshResponse.text();
    console.error("Token refresh failed:", refreshErrorText);
    throw new Error(`Token refresh failed with status ${refreshResponse.status}`);
  }
  
  const refreshData = await refreshResponse.json();
  
  if (refreshData.error) {
    console.error("Token refresh returned error:", refreshData.error);
    throw new Error(refreshData.error);
  }
  
  // Calculate new expiration time
  const expiresAt = new Date();
  expiresAt.setSeconds(expiresAt.getSeconds() + refreshData.expires_in);
  
  // Update tokens in database
  const updateData: any = {
    spotify_access_token: refreshData.access_token,
    spotify_token_expires_at: expiresAt.toISOString(),
  };
  
  if (refreshData.refresh_token) {
    updateData.spotify_refresh_token = refreshData.refresh_token;
  }
  
  const { error: updateError } = await supabase
    .from("profiles")
    .update(updateData)
    .eq("id", userId);
  
  if (updateError) {
    console.error("Error updating tokens after refresh:", updateError);
    throw new Error("Failed to update tokens");
  }
  
  // Try the search again with the new token
  const searchResponse = await fetch(
    `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=10`,
    {
      headers: {
        "Authorization": `Bearer ${refreshData.access_token}`,
      },
    }
  );
  
  if (!searchResponse.ok) {
    console.error("Search retry failed with status:", searchResponse.status);
    const searchErrorText = await searchResponse.text();
    console.error("Search retry error:", searchErrorText);
    throw new Error(`Search retry failed with status ${searchResponse.status}`);
  }
  
  const searchData = await searchResponse.json();
  
  if (!searchData?.tracks?.items) {
    console.error("Invalid search response after refresh:", searchData);
    throw new Error("Invalid search response");
  }
  
  // Transform the response
  return searchData.tracks.items.map((track: any) => ({
    id: track.id,
    name: track.name,
    artist: track.artists.map((a: any) => a.name).join(", "),
    album: track.album.name,
    albumArt: track.album.images[0]?.url || "",
    uri: track.uri,
  }));
}
