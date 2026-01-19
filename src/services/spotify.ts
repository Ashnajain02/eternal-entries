
import { supabase } from '@/integrations/supabase/client';

// Constants
const REDIRECT_URI = `${window.location.origin}/callback`;

/**
 * Check if the user has connected their Spotify account
 * and the token is still valid
 */
export const isSpotifyConnected = async (): Promise<boolean> => {
  try {
    // Get the current session to ensure we have a valid token
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      return false;
    }
    
    const { data, error } = await supabase.functions.invoke('spotify-auth', {
      body: { action: 'is_token_expired' }
    });
    
    if (error) {
      return false; // Assume not connected on error
    }
    
    return !(data?.expired || false);
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
 * Initiate the Spotify authorization process
 * Returns info about whether popup was blocked
 */
export const initiateSpotifyAuth = async (): Promise<SpotifyAuthResult> => {
  try {
    // Get the current session to ensure we have a valid token
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      return { 
        success: false, 
        error: 'No active session. Please sign in first.' 
      };
    }
    
    const { data, error } = await supabase.functions.invoke('spotify-auth', {
      body: { 
        action: 'authorize',
        redirect_uri: REDIRECT_URI
      }
    });

    if (error || !data?.url) {
      return { 
        success: false, 
        error: error?.message || 'Failed to get Spotify authorization URL' 
      };
    }

    // Try to open the popup
    const popup = window.open(data.url, '_blank');
    
    // Check if popup was blocked
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
  error?: string;
}> => {
  try {
    // Get the current session to ensure we have a valid token
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      return { 
        success: false, 
        error: 'No active session. Please sign in first.' 
      };
    }
    
    const { data, error } = await supabase.functions.invoke('spotify-auth', {
      body: { 
        action: 'callback',
        code, 
        redirect_uri: REDIRECT_URI 
      }
    });

    if (error) {
      // Extract more detailed error from FunctionsHttpError
      const errorMessage = error.message || 'Failed to connect to Spotify';
      return { success: false, error: errorMessage };
    }
    
    // Check if the response contains an error
    if (data?.error) {
      return { success: false, error: data.error };
    }

    return { 
      success: data?.success ?? false,
      display_name: data?.display_name
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

/**
 * Revoke Spotify access
 */
export const disconnectSpotify = async (): Promise<boolean> => {
  try {
    // Get the current session to ensure we have a valid token
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      return false;
    }
    
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
