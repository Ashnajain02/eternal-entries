
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
      cache: 'no-store', // Prevent caching
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
      cache: 'no-store', // Prevent caching
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

// Check connection status with Spotify - improved with direct database query and no-cache options
export async function getSpotifyConnectionStatus(): Promise<{
  connected: boolean;
  expired: boolean;
  username: string | null;
}> {
  try {
    console.log('Checking Spotify connection status...');
    
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData.session) {
      console.error('No active session when checking Spotify status');
      return { connected: false, expired: false, username: null };
    }

    // First try a direct database query for better reliability
    // Important: We use nocache:true to ensure we're getting the latest data
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('spotify_username, spotify_token_expires_at, spotify_access_token')
      .eq('id', sessionData.session.user.id)
      .single();
    
    // Cache bypass approach - also try an RPC call which has less caching
    if (profileError || !profile || !profile.spotify_username) {
      console.log('No profile data from direct query, trying status endpoint');
      
      // Get status from our edge function as a backup approach
      const timestamp = new Date().getTime(); // Add timestamp to prevent caching
      const response = await fetch(`https://veorhexddrwlwxtkuycb.functions.supabase.co/spotify-auth/status?t=${timestamp}`, {
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response from status endpoint:', errorText);
        return { connected: false, expired: false, username: null };
      }

      const result = await response.json();
      console.log('Received Spotify status from edge function:', result);
      return result;
    }
    
    console.log('Got Spotify profile data directly from database:', profile);
    const isConnected = !!profile.spotify_username && !!profile.spotify_access_token;
    const isExpired = profile.spotify_token_expires_at ? 
      new Date(profile.spotify_token_expires_at) < new Date() : 
      false;
      
    return {
      connected: isConnected,
      expired: isConnected && isExpired,
      username: profile.spotify_username || null,
    };
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
