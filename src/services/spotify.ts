
import { supabase } from '@/integrations/supabase/client';

// Constants
const REDIRECT_URI = `${window.location.origin}/spotify-callback`;
const SCOPES = ['user-read-private', 'user-read-email', 'user-top-read', 'user-read-recently-played'];

/**
 * Initiate the Spotify authorization process
 */
export const initiateSpotifyAuth = async (): Promise<void> => {
  try {
    const { data, error } = await supabase.functions.invoke('spotify-auth', {
      body: { 
        action: 'authorize',
        redirect_uri: REDIRECT_URI
      }
    });

    if (error || !data?.url) {
      throw new Error(error?.message || 'Failed to get Spotify authorization URL');
    }

    window.open(data.url, '_blank');
  } catch (error) {
    console.error('Error initiating Spotify auth:', error);
    throw error;
  }
};

/**
 * Handle the callback from Spotify with the auth code
 */
export const handleSpotifyCallback = async (code: string): Promise<{
  success: boolean;
  display_name?: string;
  error?: string;
}> => {
  try {
    const { data, error } = await supabase.functions.invoke('spotify-auth', {
      body: { 
        action: 'callback',
        code, 
        redirect_uri: REDIRECT_URI 
      }
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { 
      success: data.success,
      display_name: data.display_name
    };
  } catch (error: any) {
    console.error('Failed to handle Spotify callback:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Check if the Spotify token is expired
 */
export const isSpotifyTokenExpired = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabase.functions.invoke('spotify-auth', {
      body: { action: 'is_token_expired' }
    });
    
    if (error) {
      console.error('Error checking token expiration:', error);
      return true; // Assume expired on error
    }
    
    return data?.expired || false;
  } catch (error) {
    console.error('Failed to check token expiration:', error);
    return true; // Assume expired on error
  }
};

/**
 * Revoke Spotify access
 */
export const disconnectSpotify = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabase.functions.invoke('spotify-auth', {
      body: { action: 'revoke' }
    });
    
    if (error) {
      console.error('Error disconnecting Spotify:', error);
      return false;
    }
    
    return data?.success || false;
  } catch (error) {
    console.error('Failed to disconnect Spotify:', error);
    return false;
  }
};

/**
 * Check if the user has connected their Spotify account
 */
export const isSpotifyConnected = async (): Promise<boolean> => {
  try {
    return !(await isSpotifyTokenExpired());
  } catch (error) {
    console.error('Failed to check Spotify connection:', error);
    return false;
  }
};
