
import { supabase } from '@/integrations/supabase/client';
import { SpotifyTrack } from '@/types';

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
    
    // Call our edge function to get the auth URL with required parameters
    const response = await fetch(
      `https://veorhexddrwlwxtkuycb.functions.supabase.co/spotify-auth/authorize?` + 
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `scope=${encodeURIComponent(scopes.join(' '))}&` +
      `show_dialog=true`, 
      {
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
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
    window.open(url, '_blank', 'noopener,noreferrer');
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
      return { success: false, error: 'No active session' };
    }

    console.log('Exchanging code for tokens...');

    // Send the code to our edge function to exchange for tokens
    const response = await fetch(`https://veorhexddrwlwxtkuycb.functions.supabase.co/spotify-auth/callback?code=${code}`, {
      headers: {
        Authorization: `Bearer ${sessionData.session.access_token}`,
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
    return { 
      success: result.success, 
      display_name: result.display_name
    };
  } catch (error: any) {
    console.error('Error handling Spotify callback:', error);
    return { success: false, error: error.message || 'Unknown error occurred' };
  }
}

// Search for Spotify tracks
export async function searchSpotifyTracks(query: string): Promise<SpotifyTrack[]> {
  try {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData.session) {
      throw new Error('No active session');
    }

    // Search Spotify via our edge function
    const response = await fetch(`https://veorhexddrwlwxtkuycb.functions.supabase.co/spotify-auth/search?q=${encodeURIComponent(query)}`, {
      headers: {
        Authorization: `Bearer ${sessionData.session.access_token}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response from search endpoint:', errorText);
      
      try {
        const error = JSON.parse(errorText);
        // Special handling for token expired errors
        if (error.error && (error.error.includes("expired") || error.error.includes("token"))) {
          throw new Error("Spotify session expired, please reconnect your account");
        }
        throw new Error(error.error || 'Failed to search Spotify');
      } catch (e) {
        if (e instanceof SyntaxError) {
          throw new Error(`Failed to process response: ${errorText}`);
        }
        throw e;
      }
    }

    const { tracks } = await response.json();
    return tracks;
  } catch (error) {
    console.error('Error searching Spotify:', error);
    throw error;
  }
}

// Check connection status with Spotify
export async function getSpotifyConnectionStatus(): Promise<{
  connected: boolean;
  expired: boolean;
  username: string | null;
}> {
  try {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData.session) {
      console.error('No active session when checking Spotify status');
      return { connected: false, expired: false, username: null };
    }

    console.log('Checking Spotify connection status with session token...');
    
    // First try a direct database query for better reliability
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('spotify_username, spotify_token_expires_at')
      .eq('id', sessionData.session.user.id)
      .single();
    
    if (!profileError && profile) {
      console.log('Got Spotify profile data directly from database:', profile);
      const isConnected = !!profile.spotify_username;
      const isExpired = profile.spotify_token_expires_at ? 
        new Date(profile.spotify_token_expires_at) < new Date() : 
        false;
        
      return {
        connected: isConnected,
        expired: isConnected && isExpired,
        username: profile.spotify_username || null,
      };
    } else {
      console.log('Falling back to edge function for Spotify status');
    }
    
    // Get status from our edge function as a backup approach
    const response = await fetch('https://veorhexddrwlwxtkuycb.functions.supabase.co/spotify-auth/status', {
      headers: {
        Authorization: `Bearer ${sessionData.session.access_token}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response from status endpoint:', errorText);
      
      try {
        const error = JSON.parse(errorText);
        throw new Error(error.error || 'Failed to check Spotify connection status');
      } catch (e) {
        if (e instanceof SyntaxError) {
          throw new Error(`Failed to process response: ${errorText}`);
        }
        throw e;
      }
    }

    const result = await response.json();
    console.log('Received Spotify status from edge function:', result);
    return result;
  } catch (error) {
    console.error('Error checking Spotify status:', error);
    return { connected: false, expired: false, username: null };
  }
}

// Disconnect from Spotify
export async function disconnectSpotify(): Promise<boolean> {
  try {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData.session) {
      throw new Error('No active session');
    }

    // Call our edge function to revoke access
    const response = await fetch('https://veorhexddrwlwxtkuycb.functions.supabase.co/spotify-auth/revoke', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${sessionData.session.access_token}`,
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
