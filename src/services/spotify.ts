
// Handle the callback from Spotify OAuth flow
export async function handleSpotifyCallback(code: string): Promise<{success: boolean, display_name?: string}> {
  try {
    console.log('Starting handleSpotifyCallback with code:', code.substring(0, 5) + '...');
    
    // Get current session
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData.session) {
      console.error('No active session in handleSpotifyCallback:', sessionError);
      throw new Error('No active session. Please log in and try again.');
    }

    // Ensure we have a valid session token
    const sessionToken = sessionData.session.access_token;
    if (!sessionToken) {
      throw new Error('Invalid session token. Please log in again.');
    }

    // Send the code to our edge function to exchange for tokens
    console.log('Sending code to callback endpoint with valid auth token');
    
    // Add timeout to prevent indefinite waiting
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 seconds timeout
    
    try {
      // Use a more reliable fetch with proper headers
      const callbackEndpoint = `https://veorhexddrwlwxtkuycb.functions.supabase.co/spotify-auth/callback`;
      console.log('Calling endpoint:', callbackEndpoint);
      
      // First make sure we have a valid session by refreshing it
      await supabase.auth.refreshSession();
      
      // Get the fresh token
      const { data: refreshedSession, error: refreshError } = await supabase.auth.getSession();
      if (refreshError || !refreshedSession.session) {
        throw new Error('Failed to get refreshed session. Please log in again.');
      }
      
      const freshToken = refreshedSession.session.access_token;
      console.log('Using fresh token for callback request, token exists:', !!freshToken);
      
      const response = await fetch(
        `${callbackEndpoint}?code=${encodeURIComponent(code)}`, 
        {
          headers: {
            Authorization: `Bearer ${freshToken}`,
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
          method: 'GET',
          // Add cache control to prevent caching
          cache: 'no-store',
        }
      );

      clearTimeout(timeoutId);
      
      console.log('Callback response status:', response.status);
      
      if (!response.ok) {
        const responseText = await response.text();
        console.error('Error response from callback endpoint:', responseText);
        try {
          const error = JSON.parse(responseText);
          throw new Error(error.error || 'Failed to exchange code for tokens');
        } catch (parseError) {
          throw new Error(`Failed to exchange code: ${responseText || response.statusText}`);
        }
      }

      const result = await response.json();
      console.log('Spotify callback successful, result:', result);
      
      // Ensure we refresh the auth state
      await supabase.auth.refreshSession();
      
      return { 
        success: result.success, 
        display_name: result.display_name
      };
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      
      if (fetchError.name === 'AbortError') {
        throw new Error('Network request timed out. Please try again.');
      }
      
      console.error('Fetch error in handleSpotifyCallback:', fetchError);
      
      // Try to fetch the session again to see if it's still valid
      const { data: refreshSessionData, error: refreshSessionError } = await supabase.auth.getSession();
      if (refreshSessionError || !refreshSessionData.session) {
        throw new Error('Your session has expired. Please log in again.');
      }
      
      throw new Error(fetchError.message || 'Network error while connecting to Spotify');
    }
  } catch (error: any) {
    console.error('Error handling Spotify callback:', error);
    throw error;
  }
}
