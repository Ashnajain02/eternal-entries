
import { supabase } from '@/integrations/supabase/client';

// Constants
const REDIRECT_URI = `${window.location.origin}/callback`;

/**
 * Check if the user has connected their Spotify account
 * and the token is still valid
 */
export const isSpotifyConnected = async (): Promise<boolean> => {
  try {
    console.log("Checking if Spotify is connected");
    
    // Get the current session to ensure we have a valid token
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      console.warn('No active session. Assuming Spotify is not connected.');
      return false;
    }
    
    const { data, error } = await supabase.functions.invoke('spotify-auth', {
      body: { action: 'is_token_expired' }
    });
    
    console.log("Spotify Token expiration check response:", data, error);
    
    if (error) {
      console.error('Error checking Spotify token expiration:', error);
      return false; // Assume not connected on error
    }
    
    return !(data?.expired || false);
  } catch (error) {
    console.error('Failed to check Spotify connection:', error);
    return false;
  }
};

/**
 * Initiate the Spotify authorization process
 */
export const initiateSpotifyAuth = async (): Promise<void> => {
  try {
    console.log("Initiating Spotify auth process");
    
    // Get the current session to ensure we have a valid token
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      throw new Error('No active session. Please sign in first.');
    }
    
    const { data, error } = await supabase.functions.invoke('spotify-auth', {
      body: { 
        action: 'authorize',
        redirect_uri: REDIRECT_URI
      }
    });

    console.log("Spotify auth response:", data, error);

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
    console.log("Handling Spotify callback with code");
    
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

    console.log("Spotify callback response:", data, error);

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
 * Revoke Spotify access
 */
export const disconnectSpotify = async (): Promise<boolean> => {
  try {
    console.log("Disconnecting Spotify");
    
    // Get the current session to ensure we have a valid token
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      console.warn('No active session. Cannot disconnect Spotify.');
      return false;
    }
    
    const { data, error } = await supabase.functions.invoke('spotify-auth', {
      body: { action: 'revoke' }
    });
    
    console.log("Disconnect response:", data, error);
    
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
