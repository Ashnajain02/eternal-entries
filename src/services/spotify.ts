import { SpotifyTrack } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

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
    
    // IMPORTANT: Explicitly log the full authorization header format being sent
    const authHeader = `Bearer ${sessionData.session.access_token}`;
    console.log('Authorization header format:', 'Bearer ' + sessionData.session.access_token.substring(0, 10) + '...');
    
    // Make sure to properly handle auth headers for the edge function
    const { data, error } = await supabase.functions.invoke('spotify-auth', {
      headers: {
        Authorization: authHeader
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

// Handle the callback from Spotify OAuth flow
export async function handleSpotifyCallback2(code: string): Promise<{
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
    
    // IMPORTANT: Explicitly set and log the full Authorization header
    const authHeader = `Bearer ${accessToken}`;
    console.log('Authorization header format:', 'Bearer ' + accessToken.substring(0, 10) + '...');
    
    console.log('Invoking spotify-auth edge function with action: callback');
    
    const { data, error } = await supabase.functions.invoke('spotify-auth', {
      headers: {
        Authorization: authHeader
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

// Helper function to verify if the Spotify profile data was properly saved
export async function verifySpotifyProfileUpdate(userId: string): Promise<boolean> {
  try {
    console.log(`Verifying Spotify profile data was saved for user ${userId}...`);
    
    // Check if the profile exists and has the data
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('spotify_username, spotify_access_token')
      .eq('id', userId)
      .single();
      
    if (profileError) {
      console.error('Profile verification failed:', profileError.message);
      return false;
    }
    
    const hasData = !!profileData?.spotify_username && !!profileData?.spotify_access_token;
    
    console.log('Profile verification result:', {
      hasUsername: !!profileData?.spotify_username,
      hasToken: !!profileData?.spotify_access_token,
      username: profileData?.spotify_username
    });
    
    return hasData;
  } catch (err: any) {
    console.error('Profile verification error:', err.message);
    return false;
  }
}

// Manually update the Spotify profile data as a last resort
export async function manualProfileUpdate(
  userId: string, 
  accessToken: string,
  refreshToken: string,
  expiresAt: string,
  displayName: string
): Promise<boolean> {
  try {
    console.log(`Attempting manual profile update for user ${userId}...`);
    
    // Try RPC function first
    const { error: rpcError } = await supabase.rpc(
      'update_profile_spotify_data',
      {
        p_user_id: userId,
        p_access_token: accessToken,
        p_refresh_token: refreshToken,
        p_expires_at: expiresAt,
        p_username: displayName
      }
    );
    
    if (rpcError) {
      console.error('Manual RPC update failed:', rpcError.message);
      
      // Try direct upsert as fallback
      const { error: upsertError } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          spotify_access_token: accessToken,
          spotify_refresh_token: refreshToken,
          spotify_token_expires_at: expiresAt,
          spotify_username: displayName,
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' });
        
      if (upsertError) {
        console.error('Manual upsert failed:', upsertError.message);
        return false;
      }
    }
    
    // Verify the update worked
    return await verifySpotifyProfileUpdate(userId);
  } catch (err: any) {
    console.error('Manual update error:', err.message);
    return false;
  }
}

// Constants
const SPOTIFY_AUTH_ENDPOINT = 'https://accounts.spotify.com/authorize';
const SPOTIFY_CLIENT_ID = '834fb4c11be949b2b527500c41e2cec5';
const REDIRECT_URI = `${window.location.origin}/settings`;
