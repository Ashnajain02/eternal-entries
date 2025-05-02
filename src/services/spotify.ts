
import { supabase } from '@/integrations/supabase/client';
import { SpotifyTrack } from '@/types';

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

// Add missing functions that are being imported elsewhere

// Function to search for Spotify tracks
export async function searchSpotifyTracks(query: string): Promise<SpotifyTrack[]> {
  try {
    // Get current session
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData.session) {
      throw new Error('No active session. Please log in and try again.');
    }

    // Call Supabase edge function to search for tracks
    const { data, error } = await supabase.functions.invoke('spotify-auth/search', {
      body: { query },
      headers: {
        Authorization: `Bearer ${sessionData.session.access_token}`
      }
    });

    if (error) throw new Error(`Failed to search tracks: ${error.message}`);
    if (!data || !Array.isArray(data.tracks)) return [];

    return data.tracks.map((track: any) => ({
      id: track.id,
      name: track.name,
      artist: track.artists[0]?.name || 'Unknown Artist',
      album: track.album?.name || 'Unknown Album',
      albumArt: track.album?.images?.[0]?.url || '',
      uri: track.uri
    }));
  } catch (error: any) {
    console.error('Error searching Spotify tracks:', error);
    if (error.message?.includes('expired')) {
      throw new Error('Your Spotify session has expired. Please reconnect in Settings.');
    }
    throw error;
  }
}

// Function to check Spotify connection status
export async function getSpotifyConnectionStatus(): Promise<{ connected: boolean, expired: boolean, username: string | null }> {
  try {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData.session) {
      throw new Error('No active session. Please log in and try again.');
    }

    // Get user profile which contains Spotify connection info
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('spotify_access_token, spotify_token_expires_at, spotify_username')
      .eq('id', sessionData.session.user.id)
      .single();

    if (profileError) throw new Error(`Failed to get profile: ${profileError.message}`);

    const hasToken = !!profile?.spotify_access_token;
    const expiryTime = profile?.spotify_token_expires_at ? new Date(profile.spotify_token_expires_at) : null;
    const isExpired = expiryTime ? expiryTime < new Date() : false;

    return {
      connected: hasToken,
      expired: hasToken && isExpired,
      username: profile?.spotify_username || null
    };
  } catch (error: any) {
    console.error('Error checking Spotify connection status:', error);
    return { connected: false, expired: false, username: null };
  }
}

// Function to open Spotify auth window
export async function openSpotifyAuthWindow(): Promise<void> {
  try {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData.session) {
      throw new Error('No active session. Please log in and try again.');
    }

    // Call the auth endpoint to get the authorization URL
    const { data, error } = await supabase.functions.invoke('spotify-auth/authorize', {
      headers: {
        Authorization: `Bearer ${sessionData.session.access_token}`
      }
    });

    if (error || !data?.url) {
      throw new Error(error?.message || 'Failed to get Spotify authorization URL');
    }

    // Open the authorization URL in a popup window
    const width = 500;
    const height = 700;
    const left = (window.innerWidth - width) / 2;
    const top = (window.innerHeight - height) / 2;
    
    const authWindow = window.open(
      data.url,
      'Spotify Authorization',
      `width=${width},height=${height},top=${top},left=${left}`
    );

    if (!authWindow) {
      throw new Error('Popup window was blocked. Please allow popups for this site.');
    }
  } catch (error: any) {
    console.error('Error opening Spotify auth window:', error);
    throw error;
  }
}

// Function to disconnect Spotify
export async function disconnectSpotify(): Promise<boolean> {
  try {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData.session) {
      throw new Error('No active session. Please log in and try again.');
    }

    // Call the disconnect endpoint
    const { error } = await supabase.functions.invoke('spotify-auth/disconnect', {
      headers: {
        Authorization: `Bearer ${sessionData.session.access_token}`
      }
    });

    if (error) {
      throw new Error(error.message || 'Failed to disconnect from Spotify');
    }

    return true;
  } catch (error: any) {
    console.error('Error disconnecting Spotify:', error);
    throw error;
  }
}

// Function to refresh Spotify token
export async function refreshSpotifyToken(): Promise<boolean> {
  try {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData.session) {
      throw new Error('No active session. Please log in and try again.');
    }

    // Call the refresh endpoint
    const { data, error } = await supabase.functions.invoke('spotify-auth/refresh', {
      headers: {
        Authorization: `Bearer ${sessionData.session.access_token}`
      }
    });

    if (error || !data?.success) {
      throw new Error(error?.message || 'Failed to refresh Spotify token');
    }

    return true;
  } catch (error: any) {
    console.error('Error refreshing Spotify token:', error);
    return false;
  }
}
