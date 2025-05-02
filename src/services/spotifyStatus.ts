
import { supabase } from '@/integrations/supabase/client';

// Check connection status with Spotify - improved with direct database query and cache-busting
export async function getSpotifyConnectionStatus(): Promise<{
  connected: boolean;
  expired: boolean;
  username: string | null;
}> {
  try {
    console.log('Checking Spotify connection status...');
    
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData.session) {
      console.error('No active session when checking Spotify status');
      return { connected: false, expired: false, username: null };
    }

    console.log('Found active session for user:', sessionData.session.user.id);

    // Add a cache-busting timestamp to ensure we get fresh data
    const timestamp = new Date().getTime();
    
    try {
      // First try a direct database query with cache prevention
      console.log('Attempting direct database query for Spotify profile data...');
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('spotify_username, spotify_token_expires_at, spotify_access_token')
        .eq('id', sessionData.session.user.id)
        .single();
      
      if (!profileError && profile) {
        console.log('Got Spotify profile data from database:', {
          username: profile.spotify_username,
          hasToken: !!profile.spotify_access_token,
          expiresAt: profile.spotify_token_expires_at
        });
        
        const isConnected = !!profile.spotify_username && !!profile.spotify_access_token;
        const isExpired = profile.spotify_token_expires_at ? 
          new Date(profile.spotify_token_expires_at) < new Date() : 
          false;
          
        return {
          connected: isConnected,
          expired: isConnected && isExpired,
          username: profile.spotify_username || null,
        };
      } else {
        console.log('No profile data from direct query or error:', profileError?.message);
        console.log('Trying fallback to edge function');
      }
    } catch (dbError) {
      console.warn('Error fetching Spotify info from database:', dbError);
      // Continue to fallback
    }
    
    // Fallback to edge function
    try {
      console.log(`Calling edge function for Spotify status with timestamp: ${timestamp}`);
      
      const { data, error } = await supabase.functions.invoke('spotify-auth', {
        body: {
          action: 'status',
          t: timestamp
        }
      });
      
      if (error) {
        console.error('Error from status function:', error);
        throw new Error(error.message);
      }
      
      console.log('Received Spotify status from edge function:', data);
      return {
        connected: !!data?.connected,
        expired: !!data?.expired,
        username: data?.username || null
      };
    } catch (functionError) {
      console.error('Edge function fallback failed:', functionError);
      // All methods failed, return disconnected state
    }

    // If all methods fail, assume not connected
    return { connected: false, expired: false, username: null };
  } catch (error) {
    console.error('Error checking Spotify status:', error);
    return { connected: false, expired: false, username: null };
  }
}
