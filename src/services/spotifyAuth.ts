
import { supabase } from '@/integrations/supabase/client';

// Open Spotify authorization in a new window/tab
export async function openSpotifyAuthWindow(): Promise<void> {
  try {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData.session) {
      throw new Error('No active session');
    }

    // Required scopes for Spotify API
    const scopes = [
      'user-read-private',
      'user-read-email',
      'user-top-read'
    ];
    
    // IMPORTANT: Use the EXACT format that was registered in the Spotify Developer Dashboard
    const redirectUri = `${window.location.origin}/spotify-callback`;
    
    console.log('Opening Spotify auth with redirect URI:', redirectUri);
    console.log('Using access token with length:', sessionData.session.access_token.length);
    
    // Add timestamp to prevent caching
    const timestamp = new Date().getTime();
    
    // Make sure to properly handle auth headers for the edge function
    // IMPORTANT: The Authorization header must be exactly 'Bearer <token>'
    const { data, error } = await supabase.functions.invoke('spotify-auth', {
      headers: {
        Authorization: `Bearer ${sessionData.session.access_token}`
      },
      body: {
        action: 'authorize',
        redirect_uri: redirectUri,
        scope: scopes.join(' '),
        show_dialog: 'true',
        t: timestamp.toString(),
        user_id: sessionData.session.user.id
      },
    });

    if (error) {
      console.error('Error from authorize function:', error);
      console.error('Full error object:', JSON.stringify(error));
      throw new Error(error.message || 'Failed to get authorization URL');
    }

    if (!data || !data.url) {
      throw new Error('No authorization URL returned');
    }
    
    console.log('Received auth URL');
    
    // Open in a new tab with appropriate attributes
    const spotifyWindow = window.open(data.url, '_blank', 'noopener,noreferrer');
    
    if (!spotifyWindow) {
      throw new Error('Popup blocked. Please allow popups for this site.');
    }
  } catch (error) {
    console.error('Error opening Spotify auth window:', error);
    throw error;
  }
}

// Handle the callback from Spotify OAuth flow
export async function handleSpotifyCallback(code: string): Promise<{
  success: boolean;
  display_name?: string;
  error?: string;
  error_description?: string;
  access_token?: string;
  refresh_token?: string;
  expires_at?: string;
}> {
  try {
    console.log('Starting Spotify callback handler with code length:', code.length);
    
    // Get user session first to check if we're authenticated
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData.session) {
      console.error('No active session when handling Spotify callback:', sessionError);
      return { success: false, error: 'No active session' };
    }

    const userId = sessionData.session.user.id;
    const accessToken = sessionData.session.access_token;
    console.log('Active session found for user:', userId);
    console.log('Access token available:', !!accessToken);
    console.log('Access token length:', accessToken ? accessToken.length : 0);
    
    // Check if the profile exists and create if needed (fallback)
    console.log('Ensuring profile exists before continuing...');
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({ id: userId, updated_at: new Date().toISOString() }, { onConflict: 'id' });
      
    if (profileError) {
      console.error('Error ensuring profile exists:', profileError);
      // Continue anyway, the edge function will also try to create it
    }
    
    console.log('Exchanging code for tokens with code length:', code.length);
    
    // Ensure we're using the exact same redirect URI as in the authorization request
    const redirectUri = `${window.location.origin}/spotify-callback`;
    console.log('Using redirect URI for token exchange:', redirectUri);
    
    // Add timestamp to prevent caching
    const timestamp = new Date().getTime();
    
    // IMPORTANT: Explicitly set Authorization header with proper Bearer format
    console.log('Invoking spotify-auth edge function with action: callback');
    console.log('Using Authorization header with access token length:', accessToken ? accessToken.length : 0);
    
    const { data, error } = await supabase.functions.invoke('spotify-auth', {
      headers: {
        Authorization: `Bearer ${accessToken}` // Explicitly pass the access token with Bearer prefix
      },
      body: {
        action: 'callback',
        code,
        redirect_uri: redirectUri,
        t: timestamp,
        user_id: userId // Explicitly pass the user ID
      }
    });

    if (error) {
      console.error('Error from callback function:', error);
      console.error('Full error object:', JSON.stringify(error));
      return { 
        success: false, 
        error: error.message || 'Failed to exchange code for tokens' 
      };
    }

    if (!data) {
      console.error('No data returned from callback function');
      return { success: false, error: 'No data returned from callback function' };
    }
    
    console.log('Successfully exchanged code for tokens, display name:', data.display_name);
    
    // Double-check if the profile was updated correctly
    const { data: profileData, error: profileCheckError } = await supabase
      .from('profiles')
      .select('spotify_username, spotify_access_token')
      .eq('id', userId)
      .single();
      
    if (profileCheckError) {
      console.error('Error verifying profile update:', profileCheckError);
    } else {
      console.log('Profile verification:', {
        hasUsername: !!profileData?.spotify_username,
        hasToken: !!profileData?.spotify_access_token,
        username: profileData?.spotify_username
      });
    }
    
    // Return the full data from the callback, including tokens for potential manual updates
    return { 
      success: data.success, 
      display_name: data.display_name,
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: data.expires_at
    };
  } catch (error: any) {
    console.error('Error handling Spotify callback:', error);
    return { success: false, error: error.message || 'Unknown error occurred' };
  }
}

// Disconnect from Spotify
export async function disconnectSpotify(): Promise<boolean> {
  try {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData.session) {
      throw new Error('No active session');
    }

    // Add a timestamp to prevent caching
    const timestamp = new Date().getTime();

    // IMPORTANT: Explicitly set Authorization header for the edge function
    const { data, error } = await supabase.functions.invoke('spotify-auth', {
      headers: {
        Authorization: `Bearer ${sessionData.session.access_token}` // Explicitly pass the access token
      },
      body: {
        action: 'revoke',
        t: timestamp,
        user_id: sessionData.session.user.id // Explicitly pass the user ID
      }
    });

    if (error) {
      console.error('Error from revoke function:', error);
      console.error('Full error object:', JSON.stringify(error));
      throw new Error(error.message || 'Failed to disconnect from Spotify');
    }

    return data?.success || false;
  } catch (error) {
    console.error('Error disconnecting from Spotify:', error);
    throw error;
  }
}
