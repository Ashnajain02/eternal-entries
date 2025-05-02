import { supabase } from '@/integrations/supabase/client';

// Open Spotify authorization in a new window/tab
export async function openSpotifyAuthWindow(): Promise<void> {
  try {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData.session) {
      throw new Error('No active session');
    }

    // Required scopes for Spotify API
    const scopes = [
      'user-read-private',
      'user-read-email',
      'user-top-read'
    ];
    
    // IMPORTANT: Use the EXACT format that was registered in the Spotify Developer Dashboard
    const redirectUri = `${window.location.origin}/spotify-callback`;
    
    console.log('Opening Spotify auth with redirect URI:', redirectUri);
    console.log('Current window location:', window.location.href);
    console.log('Window origin:', window.location.origin);
    
    // Create a more resilient URL for the edge function
    const edgeFunctionUrl = `https://veorhexddrwlwxtkuycb.functions.supabase.co/spotify-auth/authorize`;
    const params = new URLSearchParams({
      redirect_uri: redirectUri,
      scope: scopes.join(' '),
      show_dialog: 'true'
    });
    
    // Call our edge function to get the auth URL with required parameters
    const response = await fetch(
      `${edgeFunctionUrl}?${params.toString()}`, 
      {
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
        cache: 'no-store', // Prevent caching
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Error response from authorize endpoint:', errorData);
      try {
        const parsedError = JSON.parse(errorData);
        throw new Error(parsedError.error || 'Failed to get authorization URL');
      } catch (parseError) {
        throw new Error(`Failed to get authorization URL: ${errorData}`);
      }
    }

    const { url } = await response.json();
    console.log('Received auth URL:', url);
    
    // Open in a new tab with appropriate attributes
    const spotifyWindow = window.open(url, '_blank', 'noopener,noreferrer');
    
    if (!spotifyWindow) {
      throw new Error('Popup blocked. Please allow popups for this site.');
    }
  } catch (error) {
    console.error('Error opening Spotify auth window:', error);
    throw error;
  }
}

// Handle the callback from Spotify OAuth flow
export async function handleSpotifyCallback(code: string): Promise<{
  success: boolean;
  display_name?: string;
  error?: string;
  error_description?: string;
}> {
  try {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData.session) {
      console.error('No active session when handling Spotify callback:', sessionError);
      return { success: false, error: 'No active session' };
    }

    console.log('Exchanging code for tokens with code length:', code.length);
    
    // Ensure we're using the exact same redirect URI as in the authorization request
    const redirectUri = `${window.location.origin}/spotify-callback`;
    console.log('Using redirect URI for token exchange:', redirectUri);
    
    // Send the code to our edge function to exchange for tokens
    const callbackUrl = `https://veorhexddrwlwxtkuycb.functions.supabase.co/spotify-auth/callback?code=${encodeURIComponent(code)}&redirect_uri=${encodeURIComponent(redirectUri)}`;
    console.log('Calling callback endpoint at:', callbackUrl);
    
    const response = await fetch(callbackUrl, {
      headers: {
        Authorization: `Bearer ${sessionData.session.access_token}`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response from callback endpoint:', errorText);
      
      try {
        const error = JSON.parse(errorText);
        return { 
          success: false, 
          error: error.error || 'Failed to exchange code for tokens',
          error_description: error.error_description
        };
      } catch (e) {
        return { success: false, error: `Failed to process response: ${errorText}` };
      }
    }

    const result = await response.json();
    console.log('Successfully exchanged code for tokens, display name:', result.display_name);
    
    return { 
      success: result.success, 
      display_name: result.display_name
    };
  } catch (error: any) {
    console.error('Error handling Spotify callback:', error);
    return { success: false, error: error.message || 'Unknown error occurred' };
  }
}

// Disconnect from Spotify
export async function disconnectSpotify(): Promise<boolean> {
  try {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData.session) {
      throw new Error('No active session');
    }

    // Add a timestamp to prevent caching
    const timestamp = new Date().getTime();

    // Call our edge function to revoke access
    const response = await fetch(`https://veorhexddrwlwxtkuycb.functions.supabase.co/spotify-auth/revoke?t=${timestamp}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${sessionData.session.access_token}`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response from revoke endpoint:', errorText);
      
      try {
        const error = JSON.parse(errorText);
        throw new Error(error.error || 'Failed to disconnect from Spotify');
      } catch (e) {
        if (e instanceof SyntaxError) {
          throw new Error(`Failed to process response: ${errorText}`);
        }
        throw e;
      }
    }

    const result = await response.json();
    return result.success;
  } catch (error) {
    console.error('Error disconnecting from Spotify:', error);
    throw error;
  }
}
