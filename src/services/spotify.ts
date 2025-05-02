
import { supabase } from '@/integrations/supabase/client';
import { SpotifyTrack } from '@/types';

// Open Spotify authorization in a new window/tab
export async function openSpotifyAuthWindow(): Promise<void> {
  try {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData.session) {
      throw new Error('No active session');
    }

    // Define the required parameters
    const redirectUri = `${window.location.origin}/spotify-callback`;
    const scope = 'user-read-private user-read-email user-top-read';
    const showDialog = true;

    console.log("Requesting Spotify auth with params:", { redirectUri, scope, showDialog });

    // Get the authorization URL from our edge function with required parameters
    const response = await fetch(
      `https://veorhexddrwlwxtkuycb.functions.supabase.co/spotify-auth/authorize?` + 
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `scope=${encodeURIComponent(scope)}&` +
      `show_dialog=${showDialog}`, 
      {
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
      }
    );

    if (!response.ok) {
      // Parse the response to get the error message
      const errorData = await response.text();
      console.error('Error response from authorize endpoint:', errorData);
      try {
        const parsedError = JSON.parse(errorData);
        throw new Error(parsedError.error || 'Failed to get authorization URL');
      } catch (parseError) {
        // If we can't parse JSON, just throw the raw error
        throw new Error(`Failed to get authorization URL: ${errorData}`);
      }
    }

    const { url } = await response.json();
    console.log("Opening Spotify auth URL:", url); // Add debug log
    
    // Open in a new tab with appropriate attributes
    const newWindow = window.open(url, '_blank');
    
    // Check if popup was blocked
    if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
      throw new Error('Popup was blocked. Please allow popups for this website.');
    }
  } catch (error) {
    console.error('Error opening Spotify auth window:', error);
    throw error;
  }
}

// Handle the callback from Spotify OAuth flow
export async function handleSpotifyCallback(code: string): Promise<{success: boolean, display_name?: string}> {
  try {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData.session) {
      throw new Error('No active session');
    }

    // Send the code to our edge function to exchange for tokens
    const response = await fetch(`https://veorhexddrwlwxtkuycb.functions.supabase.co/spotify-auth/callback?code=${code}`, {
      headers: {
        Authorization: `Bearer ${sessionData.session.access_token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to exchange code for tokens');
    }

    const result = await response.json();
    return { 
      success: result.success, 
      display_name: result.display_name
    };
  } catch (error) {
    console.error('Error handling Spotify callback:', error);
    throw error;
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
      const error = await response.json();
      // Special handling for token expired errors
      if (error.error && error.error.includes("expired")) {
        throw new Error("Spotify session expired, please reconnect your account");
      }
      throw new Error(error.error || 'Failed to search Spotify');
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
      return { connected: false, expired: false, username: null };
    }

    // Get status from our edge function
    const response = await fetch('https://veorhexddrwlwxtkuycb.functions.supabase.co/spotify-auth/status', {
      headers: {
        Authorization: `Bearer ${sessionData.session.access_token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to check Spotify connection status');
    }

    return await response.json();
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
      const error = await response.json();
      throw new Error(error.error || 'Failed to disconnect from Spotify');
    }

    const result = await response.json();
    return result.success;
  } catch (error) {
    console.error('Error disconnecting from Spotify:', error);
    throw error;
  }
}
