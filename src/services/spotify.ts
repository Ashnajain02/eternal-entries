
import { supabase } from '@/integrations/supabase/client';
import { SpotifyTrack } from '@/types';

// Get Spotify authorization URL
export const getSpotifyAuthUrl = async (): Promise<string> => {
  try {
    const { data, error } = await supabase.functions.invoke('spotify-auth/authorize');
    
    if (error) throw error;
    return data.url;
  } catch (error) {
    console.error('Error getting Spotify auth URL:', error);
    throw error;
  }
};

// Handle the callback from Spotify
export const handleSpotifyCallback = async (code: string): Promise<any> => {
  const { data: authUser } = await supabase.auth.getSession();
  
  if (!authUser.session) {
    throw new Error('You must be logged in to connect Spotify');
  }
  
  // Include current origin as redirect URI
  const redirectUri = window.location.origin + '/callback';
  
  const { data, error } = await supabase.functions.invoke('spotify-auth/callback', {
    body: { 
      code,
      redirectUri 
    }
  });
  
  if (error) throw error;
  return data;
};

// Search for tracks
export const searchSpotifyTracks = async (query: string): Promise<SpotifyTrack[]> => {
  const { data: authData } = await supabase.auth.getSession();
  
  if (!authData.session) {
    throw new Error('You must be logged in to search Spotify');
  }
  
  const { data, error } = await supabase.functions.invoke('spotify-auth/search', {
    body: { 
      query,
      userId: authData.session.user.id
    }
  });
  
  if (error) throw error;
  return data.tracks || [];
};

// Check if the user has connected Spotify
export const checkSpotifyConnection = async (): Promise<boolean> => {
  const { data: authData } = await supabase.auth.getSession();
  
  if (!authData.session) {
    return false;
  }
  
  const { data, error } = await supabase.from('profiles')
    .select('spotify_username')
    .eq('id', authData.session.user.id)
    .single();
  
  if (error || !data) return false;
  return !!data.spotify_username;
};

// Disconnect Spotify
export const disconnectSpotify = async (): Promise<void> => {
  const { data: authData } = await supabase.auth.getSession();
  
  if (!authData.session) {
    throw new Error('You must be logged in to disconnect Spotify');
  }
  
  await supabase.from('profiles')
    .update({
      spotify_username: null,
      spotify_access_token: null,
      spotify_refresh_token: null,
      spotify_token_expires_at: null
    })
    .eq('id', authData.session.user.id);
};
