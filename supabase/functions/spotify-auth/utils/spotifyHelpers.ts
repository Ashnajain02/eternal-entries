
// Format Spotify track search results with improved error detection
export function formatSpotifyTracks(items: any[]) {
  // Log raw response data for debugging
  console.log(`Formatting ${items?.length || 0} Spotify tracks`);
  
  // If items is undefined, null, or not an array
  if (!items || !Array.isArray(items)) {
    console.error("Invalid items data structure received:", items);
    return [];
  }
  
  // If items array is empty
  if (items.length === 0) {
    console.log("Empty results returned from Spotify API");
    return [];
  }
  
  // Sample log the first item to check structure
  console.log("First track structure sample:", JSON.stringify(items[0], null, 2).substring(0, 500) + "...");
  
  return items.map(track => {
    try {
      // Validate track has all required fields
      if (!track.id || !track.name || !track.artists || !track.album) {
        console.error("Track missing required fields:", track);
        return null;
      }
      
      return {
        id: track.id,
        name: track.name,
        artist: track.artists.map(artist => artist.name).join(", "),
        album: track.album.name,
        albumArt: track.album.images[0]?.url || "",
        duration: track.duration_ms,
        spotifyUri: track.uri
      };
    } catch (err) {
      console.error("Error formatting individual track:", err, track);
      return null;
    }
  }).filter(track => track !== null); // Filter out any tracks that failed formatting
}

// Ensure proper authorization header format with idempotent behavior
export function formatAuthHeader(token: string) {
  if (!token) {
    console.error("Token is empty or undefined");
    return "";
  }
  
  // Check if token already has Bearer prefix
  const hasBearer = token.startsWith("Bearer ");
  
  // Log token format details for debugging
  console.log("Token format check:", {
    length: token.length,
    startsWithBearer: hasBearer,
    firstChars: token.substring(0, 10) + "..."
  });
  
  // Return existing token if it already has Bearer prefix
  return hasBearer ? token : `Bearer ${token}`;
}

// Analyze Spotify API errors to provide more detailed diagnostics
export function analyzeSpotifyError(response: Response, responseBody: any): string {
  // Standard error codes and their meanings
  if (response.status === 401) {
    return "Authentication error: Token expired or invalid";
  } else if (response.status === 403) {
    return "Authorization error: Insufficient scopes for this operation";
  } else if (response.status === 429) {
    return "Rate limit exceeded: Too many requests";
  }
  
  // Check for specific Spotify error codes in the response
  if (responseBody?.error?.status === 400) {
    if (responseBody.error.message.includes("Invalid scope")) {
      return "Invalid scope: The token doesn't have the required permissions";
    }
    
    if (responseBody.error.message.includes("token")) {
      return "Token error: " + responseBody.error.message;
    }
  }
  
  return `Spotify API error (${response.status}): ${responseBody?.error?.message || "Unknown error"}`;
}

// Verify if token has the required scopes for search operation
export function verifyTokenScopes(decodedToken: any): boolean {
  // Search doesn't technically require scopes, but having these helps
  const recommendedScopes = [
    'user-read-private',
    'user-read-email'
  ];
  
  // If we can't verify scopes, assume it's valid to avoid blocking
  if (!decodedToken || !decodedToken.scope) {
    console.log("Unable to verify token scopes");
    return true;
  }
  
  const tokenScopes = decodedToken.scope.split(' ');
  const hasRecommendedScopes = recommendedScopes.some(scope => tokenScopes.includes(scope));
  
  console.log("Token scopes check:", {
    providedScopes: tokenScopes,
    hasRecommendedScopes
  });
  
  return hasRecommendedScopes;
}
