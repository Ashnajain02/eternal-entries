
// Open Spotify authorization in a new window/tab
export async function openSpotifyAuthWindow(): Promise<void> {
  try {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData.session) {
      throw new Error('No active session');
    }

    // Get the authorization URL from our edge function
    const authUrlEndpoint = getSpotifyAuthorizationUrl();
    const response = await fetch(authUrlEndpoint, {
      headers: {
        Authorization: `Bearer ${sessionData.session.access_token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get authorization URL');
    }

    const { url } = await response.json();
    
    // Open in a new tab
    window.open(url, '_blank', 'noopener,noreferrer');
  } catch (error) {
    console.error('Error opening Spotify auth window:', error);
    throw error;
  }
}
