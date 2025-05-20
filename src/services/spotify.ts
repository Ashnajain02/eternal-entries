
import { supabase } from '@/integrations/supabase/client';

// Constants
// Use a consistent redirect URI that matches what's registered in Spotify
const REDIRECT_URI = window.location.origin + '/settings';
const SCOPES = ['user-read-private', 'user-read-email', 'user-top-read', 'user-read-recently-played'];

// Get the authorization URL for Spotify
export const getAuthorizationUrl = () => {
  const params = new URLSearchParams({
    client_id: '834fb4c11be949b2b527500c41e2cec5', // Using the new client ID directly
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    scope: SCOPES.join(' '),
  });

  return `https://accounts.spotify.com/authorize?${params.toString()}`;
};

// Handle the callback from Spotify with the auth code
export const handleSpotifyCallback = async (code: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase.functions.invoke('spotify-auth', {
      body: { code, redirect_uri: REDIRECT_URI }
    });

    if (error) {
      console.error('Error exchanging code for token:', error);
      return false;
    }

    return data?.success || false;
  } catch (error) {
    console.error('Failed to exchange auth code:', error);
    return false;
  }
};

// Get the user's recent tracks
export const getRecentTracks = async (): Promise<any> => {
  try {
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error('No authenticated user found');
      return null;
    }

    const { data, error } = await supabase.rpc('is_spotify_token_expired', {
      user_id: user.id
    });
    
    if (error) {
      console.error('Error checking Spotify token:', error);
      return null;
    }

    if (data === true) {
      // Token is expired, user needs to re-authenticate
      return { error: 'EXPIRED_TOKEN' };
    }

    const { data: tracks, error: tracksError } = await supabase.functions.invoke('spotify-auth', {
      body: { action: 'get_recent_tracks' }
    });

    if (tracksError) {
      console.error('Error getting recent tracks:', tracksError);
      return null;
    }

    return tracks;
  } catch (error) {
    console.error('Failed to get recent tracks:', error);
    return null;
  }
};

// Check if the user has connected their Spotify account
export const isSpotifyConnected = async (): Promise<boolean> => {
  try {
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error('No authenticated user found');
      return false;
    }
    
    const { data, error } = await supabase.rpc('is_spotify_token_expired', {
      user_id: user.id
    });
    
    if (error) {
      console.error('Error checking Spotify connection:', error);
      return false;
    }

    // If token is not expired, user is connected
    return data === false;
  } catch (error) {
    console.error('Failed to check Spotify connection:', error);
    return false;
  }
};
