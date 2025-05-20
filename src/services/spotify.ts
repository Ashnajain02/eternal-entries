
import { SpotifyTrack } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

const SPOTIFY_AUTH_ENDPOINT = 'https://accounts.spotify.com/authorize';
const SPOTIFY_CLIENT_ID = '1f801b5480f34838a68ad552ed406151';
const REDIRECT_URI = `${window.location.origin}/settings`;

// Get the current connection status
export async function getSpotifyConnectionStatus(): Promise<{ 
  connected: boolean; 
  expired: boolean; 
  username: string | null;
}> {
  try {
    const { data, error } = await supabase.functions.invoke('spotify-auth', {
      body: { action: 'check-connection' }
    });

    if (error) throw new Error(error.message);
    
    return {
      connected: !!data?.connected,
      expired: !!data?.expired,
      username: data?.username || null
    };
  } catch (error) {
    console.error('Error checking Spotify connection:', error);
    return { connected: false, expired: false, username: null };
  }
}

// Connect to Spotify by redirecting to the Spotify auth page
export function connectToSpotify() {
  const scopes = [
    'user-read-private',
    'user-read-email',
    'user-read-currently-playing',
    'user-read-recently-played'
  ];
  
  // Generate a state value for security
  const state = Math.random().toString(36).substring(2, 15);
  localStorage.setItem('spotify_auth_state', state);
  
  const authUrl = new URL(SPOTIFY_AUTH_ENDPOINT);
  authUrl.searchParams.append('client_id', SPOTIFY_CLIENT_ID);
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('redirect_uri', REDIRECT_URI);
  authUrl.searchParams.append('state', state);
  authUrl.searchParams.append('scope', scopes.join(' '));
  
  window.location.href = authUrl.toString();
}

// Exchange code for access token
export async function handleSpotifyCallback(code: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.functions.invoke('spotify-auth', {
      body: { action: 'exchange-token', code, redirectUri: REDIRECT_URI }
    });

    if (error) throw new Error(error.message);
    
    if (data?.success) {
      toast({
        title: 'Spotify Connected',
        description: `Connected as ${data.username || 'a Spotify user'}`,
      });
      return true;
    } else {
      throw new Error(data?.message || 'Failed to connect Spotify');
    }
  } catch (error: any) {
    console.error('Error handling Spotify callback:', error);
    toast({
      title: 'Connection Failed',
      description: error.message || 'Could not connect to Spotify',
      variant: 'destructive',
    });
    return false;
  }
}

// Search for tracks
export async function searchSpotifyTracks(query: string): Promise<SpotifyTrack[]> {
  if (!query.trim()) return [];
  
  try {
    const { data, error } = await supabase.functions.invoke('spotify-auth', {
      body: { action: 'search-tracks', query }
    });

    if (error) throw new Error(error.message);
    
    if (!data?.tracks) {
      return [];
    }
    
    return data.tracks;
  } catch (error: any) {
    console.error('Error searching Spotify tracks:', error);
    // If the token is expired, we should indicate this specifically
    if (error.message?.includes('token expired') || error.message?.includes('invalid token')) {
      throw new Error('Your Spotify session has expired. Please reconnect your account in Settings.');
    }
    throw error;
  }
}

// Disconnect Spotify
export async function disconnectSpotify(): Promise<boolean> {
  try {
    const { data, error } = await supabase.functions.invoke('spotify-auth', {
      body: { action: 'disconnect' }
    });

    if (error) throw new Error(error.message);
    
    if (data?.success) {
      toast({
        title: 'Spotify Disconnected',
        description: 'Your Spotify account has been disconnected',
      });
      return true;
    } else {
      throw new Error(data?.message || 'Failed to disconnect Spotify');
    }
  } catch (error: any) {
    console.error('Error disconnecting from Spotify:', error);
    toast({
      title: 'Error',
      description: error.message || 'Could not disconnect from Spotify',
      variant: 'destructive',
    });
    return false;
  }
}
