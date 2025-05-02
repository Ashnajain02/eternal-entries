
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
    
    // Add timestamp to prevent caching
    const timestamp = new Date().getTime();
    
    // Use the supabase.functions.invoke method instead of fetch
    const { data, error } = await supabase.functions.invoke('spotify-auth', {
      body: {
        action: 'authorize',
        redirect_uri: redirectUri,
        scope: scopes.join(' '),
        show_dialog: 'true',
        t: timestamp.toString(),
        user_id: sessionData.session.user.id // Pass user ID explicitly
      },
    });

    if (error) {
      console.error('Error from authorize function:', error);
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
}> {
  try {
    console.log('Starting Spotify callback handler with code length:', code.length);
    
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData.session) {
      console.error('No active session when handling Spotify callback:', sessionError);
      return { success: false, error: 'No active session' };
    }

    const userId = sessionData.session.user.id;
    console.log('Active session found for user:', userId);
    console.log('Exchanging code for tokens with code length:', code.length);
    
    // Ensure we're using the exact same redirect URI as in the authorization request
    const redirectUri = `${window.location.origin}/spotify-callback`;
    console.log('Using redirect URI for token exchange:', redirectUri);
    
    // Add timestamp to prevent caching
    const timestamp = new Date().getTime();
    
    // Check if the profile exists before trying to update it
    const { data: profileExists, error: profileCheckError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();
      
    if (profileCheckError) {
      console.error('Error checking if profile exists:', profileCheckError);
    } else if (!profileExists) {
      console.log('Profile does not exist for user, creating one');
      const { error: createProfileError } = await supabase
        .from('profiles')
        .insert({ id: userId });
        
      if (createProfileError) {
        console.error('Failed to create profile:', createProfileError);
        return {
          success: false,
          error: 'Failed to create user profile',
          error_description: createProfileError.message
        };
      }
    }
    
    // Use the supabase.functions.invoke method with proper error handling
    try {
      console.log('Invoking spotify-auth edge function with action: callback');
      
      const { data, error } = await supabase.functions.invoke('spotify-auth', {
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
      
      // Verify the profile was updated correctly using RPC
      try {
        console.log('Verifying profile update using RPC...');
        const { data: rpcResult, error: rpcError } = await supabase.rpc(
          'update_profile_spotify_data',
          {
            p_user_id: userId,
            p_access_token: data.access_token || '',
            p_refresh_token: data.refresh_token || '',
            p_expires_at: data.expires_at || new Date(Date.now() + 3600000).toISOString(),
            p_username: data.display_name || 'Spotify User'
          }
        );
        
        if (rpcError) {
          console.error('RPC update error:', rpcError);
        } else {
          console.log('RPC update succeeded:', rpcResult);
        }
      } catch (rpcError) {
        console.error('Error calling RPC function:', rpcError);
      }
      
      // Double-check if the profile was updated correctly
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('spotify_username, spotify_access_token')
        .eq('id', userId)
        .single();
        
      if (profileError) {
        console.error('Error verifying profile update:', profileError);
      } else {
        console.log('Profile verification:', {
          hasUsername: !!profileData?.spotify_username,
          hasToken: !!profileData?.spotify_access_token,
          username: profileData?.spotify_username
        });
        
        // If the profile verification shows the data wasn't saved, try a direct update
        if (!profileData?.spotify_access_token || !profileData?.spotify_username) {
          console.log('Profile update verification failed, attempting direct update');
          
          const { error: manualUpdateError } = await supabase
            .from('profiles')
            .update({
              spotify_username: data.display_name,
              spotify_token_expires_at: data.expires_at
            })
            .eq('id', userId);
            
          if (manualUpdateError) {
            console.error('Manual profile update failed:', manualUpdateError);
          } else {
            console.log('Manual profile update succeeded');
          }
        }
      }
      
      return { 
        success: data.success, 
        display_name: data.display_name
      };
    } catch (functionError) {
      console.error('Edge function error:', functionError);
      return { 
        success: false, 
        error: 'Edge function error', 
        error_description: functionError.message 
      };
    }
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

    // Use the supabase.functions.invoke method
    const { data, error } = await supabase.functions.invoke('spotify-auth', {
      body: {
        action: 'revoke',
        t: timestamp,
        user_id: sessionData.session.user.id // Explicitly pass the user ID
      }
    });

    if (error) {
      console.error('Error from revoke function:', error);
      throw new Error(error.message || 'Failed to disconnect from Spotify');
    }

    return data?.success || false;
  } catch (error) {
    console.error('Error disconnecting from Spotify:', error);
    throw error;
  }
}
