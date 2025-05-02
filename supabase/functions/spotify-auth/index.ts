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
    console.log("Handling CORS preflight request");
    return new Response(null, { headers: corsHeaders, status: 204 });
  }
  
  try {
    // IMPROVED: Better authentication checking and logging
    const authHeader = req.headers.get("Authorization");
    console.log("Auth header present:", !!authHeader);
    
    // Extract userId directly from the request body if possible
    let userId = null;
    let verifiedUser = null;
    
    // Parse request body to get the action and parameters
    let action, params;
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
      return new Response(
        JSON.stringify({ 
          error: "Invalid request format", 
          details: parseError.message 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
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
    
    // If no action provided, return error
    if (!action) {
      console.error("No action specified in request");
      return new Response(
        JSON.stringify({ error: "No action specified" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }
    
    // Search endpoint - search for tracks
    if (action === "search") {
      try {
        console.log("Handling search request with params:", params);
        
        const query = params.q;
        
        if (!query) {
          console.error("Missing search query parameter");
          return new Response(
            JSON.stringify({ 
              error: "Missing search query", 
              details: "The 'q' parameter is required for search" 
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
          );
        }
        
        // If userId is not provided, return error
        if (!userId) {
          console.error("No user ID found for search action");
          return new Response(
            JSON.stringify({ 
              error: "No user ID available", 
              details: "User ID must be provided either via authenticated token or in request parameters (user_id)" 
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
          );
        }
        
        console.log(`Performing Spotify search for user ${userId} with query "${query}"`);
        
        // Get the user's access token
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("spotify_access_token, spotify_token_expires_at")
          .eq("id", userId)
          .single();
        
        if (profileError) {
          console.error("Error fetching Spotify access token:", profileError);
          return new Response(
            JSON.stringify({ 
              error: "Failed to fetch access token", 
              details: profileError.message 
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
          );
        }
        
        console.log("Spotify profile data:", {
          hasToken: !!profile?.spotify_access_token,
          expiresAt: profile?.spotify_token_expires_at
        });
        
        if (!profile?.spotify_access_token) {
          return new Response(
            JSON.stringify({ error: "No Spotify access token found" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
          );
        }
        
        // Check if token is expired
        if (profile.spotify_token_expires_at && new Date(profile.spotify_token_expires_at) < new Date()) {
          return new Response(
            JSON.stringify({ 
              error: "Spotify token expired", 
              error_description: "Please reconnect your Spotify account" 
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
          );
        }
        
        // Search for tracks using the Spotify API
        console.log(`Calling Spotify API with query: ${query}`);
        const searchResponse = await fetch(
          `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=10`,
          {
            headers: {
              "Authorization": `Bearer ${profile.spotify_access_token}`,
            },
          }
        );
        
        console.log("Spotify API response status:", searchResponse.status);
        
        if (!searchResponse.ok) {
          let errorText = "";
          try {
            errorText = await searchResponse.text();
            console.error("Spotify search error response:", errorText);
          } catch (e) {
            console.error("Could not read error response:", e);
          }
          
          // Check if the error is due to token expiration
          if (searchResponse.status === 401) {
            return new Response(
              JSON.stringify({ 
                error: "Spotify token expired or invalid", 
                error_description: "Please reconnect your Spotify account",
                details: errorText 
              }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
            );
          }
          
          return new Response(
            JSON.stringify({ 
              error: "Spotify search failed", 
              details: `Status: ${searchResponse.status}`,
              response: errorText 
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: searchResponse.status }
          );
        }
        
        // Parse the search results
        let searchData;
        try {
          searchData = await searchResponse.json();
        } catch (parseError) {
          console.error("Error parsing Spotify API response:", parseError);
          return new Response(
            JSON.stringify({
              error: "Failed to parse Spotify API response",
              details: parseError.message
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
          );
        }
        
        console.log(`Spotify search results: ${searchData.tracks?.items?.length || 0} tracks found`);
        
        // Format the search results
        const tracks = searchData.tracks.items.map(track => ({
          id: track.id,
          name: track.name,
          artist: track.artists.map(artist => artist.name).join(", "),
          album: track.album.name,
          albumArt: track.album.images[0]?.url || "",
          duration: track.duration_ms,
          spotifyUri: track.uri
        }));
        
        return new Response(
          JSON.stringify({ tracks }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      } catch (searchError) {
        console.error("Error searching tracks:", searchError);
        return new Response(
          JSON.stringify({ 
            error: "Error searching tracks", 
            details: searchError.message 
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
        );
      }
    }
    
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
        console.log(`Checking if profile exists for user ${userId}`);
        const { data: profileData, error: profileCheckError } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", userId)
          .maybeSingle();
          
        if (profileCheckError) {
          console.error("Error checking if profile exists:", profileCheckError);
          return new Response(
            JSON.stringify({ 
              error: "Failed to check profile existence", 
              details: profileCheckError.message 
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
          );
        } else if (!profileData) {
          console.log(`Profile does not exist for user ${userId}, creating one`);
          
          try {
            // Create a new profile with minimal data - we'll update it with Spotify data later
            const { error: createProfileError } = await supabase
              .from("profiles")
              .insert([{ id: userId }]);
              
            if (createProfileError) {
              console.error("Failed to create profile:", createProfileError);
              
              // Try to use the RPC function as fallback
              console.log("Attempting to use RPC function as fallback for profile creation");
              const { error: rpcError } = await supabase.rpc(
                "update_profile_spotify_data",
                {
                  p_user_id: userId,
                  p_access_token: '',
                  p_refresh_token: '',
                  p_expires_at: new Date().toISOString(),
                  p_username: 'New User'
                }
              );
              
              if (rpcError) {
                console.error("RPC creation fallback also failed:", rpcError);
                return new Response(
                  JSON.stringify({ 
                    error: "Failed to create user profile", 
                    details: `Original error: ${createProfileError.message}, RPC fallback error: ${rpcError.message}` 
                  }),
                  { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
                );
              } else {
                console.log("Successfully created profile using RPC function");
              }
            } else {
              console.log("Successfully created profile for user");
            }
          } catch (profileCreationError) {
            console.error("Exception during profile creation:", profileCreationError);
            return new Response(
              JSON.stringify({ 
                error: "Exception during profile creation", 
                details: profileCreationError.message
              }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
            );
          }
        } else {
          console.log(`Found existing profile for user ${userId}`);
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
                    details: `Status: ${tokenResponse.status}, Response: ${errorBody.substring(0, 100)}...`
                  }),
                  { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
                );
              }
            } catch (responseReadError) {
              console.error("Error reading token exchange response:", responseReadError);
              return new Response(
                JSON.stringify({ 
                  error: "Error reading token exchange response", 
                  details: responseReadError.message
                }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
              );
            }
          }
          
          let tokenData;
          try {
            tokenData = await tokenResponse.json();
          } catch (tokenJsonError) {
            console.error("Error parsing token response JSON:", tokenJsonError);
            return new Response(
              JSON.stringify({ 
                error: "Error parsing token response", 
                details: tokenJsonError.message 
              }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
            );
          }
          
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
              let profileErrorText = "";
              try {
                profileErrorText = await profileResponse.text();
              } catch (e) {
                profileErrorText = "Could not read error response";
              }
              console.error("Profile fetch error text:", profileErrorText);
              return new Response(
                JSON.stringify({ 
                  error: "Failed to fetch profile", 
                  details: `Status: ${profileResponse.status}, Response: ${profileErrorText}`
                }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: profileResponse.status }
              );
            }
            
            let profileData;
            try {
              profileData = await profileResponse.json();
            } catch (profileJsonError) {
              console.error("Error parsing profile response JSON:", profileJsonError);
              return new Response(
                JSON.stringify({ 
                  error: "Error parsing profile response", 
                  details: profileJsonError.message 
                }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
              );
            }
            
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
              spotify_username: profileData.display_name || profileData.id,
              expires_at: expiresAt.toISOString()
            });
            
            // First, try using the function we created for reliability
            let profileUpdateSuccess = false;
            
            try {
              console.log("Attempting to update profile data using RPC function...");
              const { data: rpcResult, error: rpcError } = await supabase.rpc(
                "update_profile_spotify_data",
                {
                  p_user_id: userId,
                  p_access_token: tokenData.access_token,
                  p_refresh_token: tokenData.refresh_token || "",
                  p_expires_at: expiresAt.toISOString(),
                  p_username: profileData.display_name || profileData.id
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
                    spotify_access_token: tokenData.access_token,
                    spotify_refresh_token: tokenData.refresh_token,
                    spotify_token_expires_at: expiresAt.toISOString(),
                    spotify_username: profileData.display_name || profileData.id,
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
                    spotify_access_token: tokenData.access_token,
                    spotify_refresh_token: tokenData.refresh_token,
                    spotify_token_expires_at: expiresAt.toISOString(),
                    spotify_username: profileData.display_name || profileData.id,
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
                } else {
                  profileUpdateSuccess = true;
                }
              }
            } catch (verifyError) {
              console.error("Error during verification:", verifyError);
            }
            
            if (!profileUpdateSuccess) {
              return new Response(
                JSON.stringify({ 
                  error: "Failed to save Spotify data to database after multiple attempts",
                  success: false 
                }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
              );
            }
            
            return new Response(
              JSON.stringify({ 
                success: true,
                display_name: profileData.display_name,
                access_token: tokenData.access_token,
                refresh_token: tokenData.refresh_token,
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
        } catch (tokenFetchError) {
          console.error("Error fetching token from Spotify:", tokenFetchError);
          return new Response(
            JSON.stringify({ 
              error: "Error fetching token from Spotify", 
              details: tokenFetchError.message
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
        const isExpired = profile?.spotify_token_expires_at ? new Date(profile.spotify_token_expires_at) < new Date() : true;
        
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
          method: "
