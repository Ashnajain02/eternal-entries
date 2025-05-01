
import { supabase } from '@/integrations/supabase/client';
import { SpotifyTrack } from '@/types';

// Open Spotify authorization in a new window/tab
export async function openSpotifyAuthWindow(): Promise<void> {
  try {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData.session) {
      throw new Error('No active session');
    }

    // Get the authorization URL from our edge function
    const response = await fetch(`${window.location.origin}/api/spotify-auth/authorize`, {
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

// Handle the callback from Spotify OAuth flow
export async function handleSpotifyCallback(code: string): Promise<{success: boolean, display_name?: string}> {
  try {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData.session) {
      throw new Error('No active session');
    }

    // Send the code to our edge function to exchange for tokens
    const response = await fetch(`${window.location.origin}/api/spotify-auth/callback?code=${code}`, {
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
    const response = await fetch(`${window.location.origin}/api/spotify-auth/search?q=${encodeURIComponent(query)}`, {
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
    const response = await fetch(`${window.location.origin}/api/spotify-auth/status`, {
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
    const response = await fetch(`${window.location.origin}/api/spotify-auth/revoke`, {
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
