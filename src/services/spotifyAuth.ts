
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
    
    // Add timestamp to prevent caching
    const timestamp = new Date().getTime();
    
    // Use the supabase.functions.invoke method instead of fetch
    const { data, error } = await supabase.functions.invoke('spotify-auth', {
      body: {
        action: 'authorize',
        redirect_uri: redirectUri,
        scope: scopes.join(' '),
        show_dialog: 'true',
        t: timestamp.toString()
      },
    });

    if (error) {
      console.error('Error from authorize function:', error);
      throw new Error(error.message || 'Failed to get authorization URL');
    }

    if (!data || !data.url) {
      throw new Error('No authorization URL returned');
    }
    
    console.log('Received auth URL');
    
    // Open in a new tab with appropriate attributes
    const spotifyWindow = window.open(data.url, '_blank', 'noopener,noreferrer');
    
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
    
    // Add timestamp to prevent caching
    const timestamp = new Date().getTime();
    
    // Use the supabase.functions.invoke method instead of fetch
    const { data, error } = await supabase.functions.invoke('spotify-auth', {
      body: {
        action: 'callback',
        code,
        redirect_uri: redirectUri,
        t: timestamp
      }
    });

    if (error) {
      console.error('Error from callback function:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to exchange code for tokens' 
      };
    }

    if (!data) {
      return { success: false, error: 'No data returned from callback function' };
    }
    
    console.log('Successfully exchanged code for tokens, display name:', data.display_name);
    
    return { 
      success: data.success, 
      display_name: data.display_name
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

    // Use the supabase.functions.invoke method
    const { data, error } = await supabase.functions.invoke('spotify-auth', {
      body: {
        action: 'revoke',
        t: timestamp
      }
    });

    if (error) {
      console.error('Error from revoke function:', error);
      throw new Error(error.message || 'Failed to disconnect from Spotify');
    }

    return data?.success || false;
  } catch (error) {
    console.error('Error disconnecting from Spotify:', error);
    throw error;
  }
}
