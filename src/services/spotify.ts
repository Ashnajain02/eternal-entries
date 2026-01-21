import { supabase } from '@/integrations/supabase/client';
import { SPOTIFY_REDIRECT_URI } from '@/constants/spotify';

/**
 * Check if the user has connected their Spotify account
 */
export const isSpotifyConnected = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabase.functions.invoke('spotify-playback-token', {
      body: { action: 'is_connected' }
    });
    
    if (error) {
      return false;
    }
    
    return data?.connected ?? false;
  } catch (error) {
    return false;
  }
};

/**
 * Result of initiating Spotify auth
 */
export interface SpotifyAuthResult {
  success: boolean;
  popupBlocked?: boolean;
  error?: string;
}

/**
 * Initiate the Spotify authorization process via popup
 */
export const initiateSpotifyAuth = async (): Promise<SpotifyAuthResult> => {
  try {
    const { data, error } = await supabase.functions.invoke('spotify-auth', {
      body: { 
        action: 'authorize',
        redirect_uri: SPOTIFY_REDIRECT_URI
      }
    });

    if (error || !data?.url) {
      return { 
        success: false, 
        error: error?.message || 'Failed to get Spotify authorization URL' 
      };
    }

    // Open Spotify auth in popup
    const popup = window.open(data.url, '_blank');
    
    if (!popup || popup.closed || typeof popup.closed === 'undefined') {
      return { 
        success: false, 
        popupBlocked: true,
        error: 'Popup was blocked by the browser'
      };
    }
    
    return { success: true };
  } catch (error: any) {
    return { 
      success: false, 
      error: error.message || 'An unexpected error occurred'
    };
  }
};

/**
 * Handle the callback from Spotify with the auth code
 */
export const handleSpotifyCallback = async (code: string): Promise<{
  success: boolean;
  display_name?: string;
  is_premium?: boolean;
  error?: string;
}> => {
  try {
    const { data, error } = await supabase.functions.invoke('spotify-auth', {
      body: { 
        action: 'callback',
        code, 
        redirect_uri: SPOTIFY_REDIRECT_URI 
      }
    });

    if (error) {
      return { success: false, error: error.message || 'Failed to connect to Spotify' };
    }
    
    if (data?.error) {
      return { success: false, error: data.error };
    }

    return { 
      success: data?.success ?? false,
      display_name: data?.display_name,
      is_premium: data?.is_premium
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

/**
 * Disconnect Spotify account
 */
export const disconnectSpotify = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabase.functions.invoke('spotify-auth', {
      body: { action: 'revoke' }
    });
    
    if (error) {
      return false;
    }
    
    return data?.success || false;
  } catch (error) {
    return false;
  }
};
