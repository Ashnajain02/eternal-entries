
import { corsHeaders } from "../utils/corsHeaders.ts";
import { createErrorResponse, createSuccessResponse } from "../utils/responseHelpers.ts";
import { formatSpotifyTracks, formatAuthHeader, analyzeSpotifyError } from "../utils/spotifyHelpers.ts";

export async function handleSearch(supabase, params, userId) {
  try {
    console.log("Handling search request with params:", params);
    
    const query = params.q;
    
    if (!query) {
      console.error("Missing search query parameter");
      return createErrorResponse(
        400, 
        "Missing search query", 
        "The 'q' parameter is required for search"
      );
    }
    
    // If userId is not provided, return error
    if (!userId) {
      console.error("No user ID found for search action");
      return createErrorResponse(
        400, 
        "No user ID available", 
        "User ID must be provided either via authenticated token or in request parameters (user_id)"
      );
    }
    
    console.log(`Performing Spotify search for user ${userId} with query "${query}"`);
    
    // Get the user's access token
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("spotify_access_token, spotify_token_expires_at")
      .eq("id", userId)
      .maybeSingle();
    
    if (profileError) {
      console.error("Error fetching Spotify access token:", profileError);
      return createErrorResponse(500, "Failed to fetch access token", profileError.message);
    }
    
    console.log("Spotify profile data:", {
      hasToken: !!profile?.spotify_access_token,
      expiresAt: profile?.spotify_token_expires_at,
      tokenPrefix: profile?.spotify_access_token ? profile.spotify_access_token.substring(0, 10) + '...' : 'null',
      tokenLength: profile?.spotify_access_token ? profile.spotify_access_token.length : 0
    });
    
    if (!profile || !profile.spotify_access_token) {
      return createErrorResponse(
        400, 
        "No Spotify access token found",
        "Please connect your Spotify account in the settings"
      );
    }
    
    // Check if token is expired
    if (profile.spotify_token_expires_at && new Date(profile.spotify_token_expires_at) < new Date()) {
      return createErrorResponse(
        401, 
        "Spotify token expired", 
        "Please reconnect your Spotify account"
      );
    }
    
    // Search for tracks using the Spotify API
    console.log(`Calling Spotify API with query: ${query}`);
    try {
      const spotifyToken = profile.spotify_access_token;
      
      // Ensure proper authorization header format
      const authorizationHeader = formatAuthHeader(spotifyToken);
        
      console.log("Using authorization header:", authorizationHeader.substring(0, 20) + "...");
      
      // Log the complete request details for debugging
      console.log("Spotify API request:", {
        url: `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=10`,
        authHeaderLength: authorizationHeader.length,
        authHeaderStart: authorizationHeader.substring(0, 15) + "..."
      });
      
      const searchResponse = await fetch(
        `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=10`,
        {
          headers: {
            "Authorization": authorizationHeader,
            "Content-Type": "application/json"
          },
        }
      );
      
      console.log("Spotify API response status:", searchResponse.status);
      
      // Get the response body as text first for complete logging
      let responseText;
      try {
        responseText = await searchResponse.text();
        console.log("Response body (first 300 chars):", responseText.substring(0, 300) + "...");
      } catch (textError) {
        console.error("Error reading response text:", textError);
      }
      
      if (!searchResponse.ok) {
        // Try to parse the error response for better analysis
        let errorData = null;
        try {
          if (responseText) {
            errorData = JSON.parse(responseText);
          }
        } catch (e) {
          console.error("Failed to parse error response:", e);
        }
        
        // Use the enhanced error analyzer
        const errorDetails = analyzeSpotifyError(searchResponse, errorData);
        console.error("Spotify API error details:", errorDetails);
        
        // Check if the error is due to token expiration
        if (searchResponse.status === 401) {
          return createErrorResponse(
            401, 
            "Spotify token expired or invalid", 
            "Please reconnect your Spotify account"
          );
        }
        
        return createErrorResponse(
          searchResponse.status, 
          "Spotify search failed", 
          errorDetails
        );
      }
      
      // Parse the search results
      let searchData;
      try {
        searchData = responseText ? JSON.parse(responseText) : null;
        console.log("Spotify search response parsed successfully");
        console.log(`Tracks data structure exists: ${!!searchData?.tracks}`);
        console.log(`Items array exists: ${!!searchData?.tracks?.items}`);
        console.log(`Items count: ${searchData?.tracks?.items?.length || 0}`);
      } catch (parseError) {
        console.error("Error parsing Spotify API response:", parseError);
        return createErrorResponse(500, "Failed to parse Spotify API response", parseError.message);
      }
      
      // Check if we have a valid tracks structure
      if (!searchData?.tracks?.items) {
        console.error("Invalid or missing tracks data structure:", searchData);
        return createErrorResponse(
          500,
          "Invalid Spotify API response format",
          "The API response did not contain the expected data structure"
        );
      }
      
      console.log(`Spotify search results: ${searchData.tracks?.items?.length || 0} tracks found`);
      
      // Format the search results with our enhanced formatter
      const tracks = formatSpotifyTracks(searchData.tracks.items);
      
      return createSuccessResponse({ tracks });
    } catch (spotifyApiError) {
      console.error("Error calling Spotify API:", spotifyApiError);
      return createErrorResponse(500, "Error calling Spotify API", spotifyApiError.message);
    }
  } catch (searchError) {
    console.error("Error searching tracks:", searchError);
    return createErrorResponse(500, "Error searching tracks", searchError.message);
  }
}
