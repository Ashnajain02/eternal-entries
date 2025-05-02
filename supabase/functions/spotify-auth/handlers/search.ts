
import { corsHeaders } from "../utils/corsHeaders.ts";
import { createErrorResponse, createSuccessResponse } from "../utils/responseHelpers.ts";
import { formatSpotifyTracks, formatAuthHeader } from "../utils/spotifyHelpers.ts";

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
      
      // Log the token format to check if it has Bearer prefix already
      console.log("Token format check:", {
        startsWithBearer: spotifyToken.startsWith("Bearer "),
        firstFewChars: spotifyToken.substring(0, 10) + "...",
        length: spotifyToken.length
      });
      
      // Ensure proper authorization header format
      const authorizationHeader = formatAuthHeader(spotifyToken);
        
      console.log("Using authorization header:", authorizationHeader.substring(0, 20) + "...");
      
      const searchResponse = await fetch(
        `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=10`,
        {
          headers: {
            "Authorization": authorizationHeader,
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
          return createErrorResponse(
            401, 
            "Spotify token expired or invalid", 
            "Please reconnect your Spotify account"
          );
        }
        
        return createErrorResponse(
          searchResponse.status, 
          "Spotify search failed", 
          `Status: ${searchResponse.status}, Response: ${errorText}`
        );
      }
      
      // Parse the search results
      let searchData;
      try {
        searchData = await searchResponse.json();
        console.log("Spotify search response parsed successfully");
      } catch (parseError) {
        console.error("Error parsing Spotify API response:", parseError);
        return createErrorResponse(500, "Failed to parse Spotify API response", parseError.message);
      }
      
      console.log(`Spotify search results: ${searchData.tracks?.items?.length || 0} tracks found`);
      
      // Format the search results
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
