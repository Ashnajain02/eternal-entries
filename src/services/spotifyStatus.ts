
import { supabase } from '@/integrations/supabase/client';

// Check connection status with Spotify - improved with direct database query and no-cache options
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

    // First try a direct database query
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('spotify_username, spotify_token_expires_at, spotify_access_token')
      .eq('id', sessionData.session.user.id)
      .single();
    
    // If direct query fails, try the RPC call which has less caching
    if (profileError || !profile || !profile.spotify_username) {
      console.log('No profile data from direct query, trying status endpoint');
      
      // Get status from our edge function as a backup approach
      const timestamp = new Date().getTime(); // Add timestamp to prevent caching
      const response = await fetch(`https://veorhexddrwlwxtkuycb.functions.supabase.co/spotify-auth/status?t=${timestamp}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        // Add a signal with timeout
        signal: AbortSignal.timeout(5000)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response from status endpoint:', errorText);
        return { connected: false, expired: false, username: null };
      }

      const result = await response.json();
      console.log('Received Spotify status from edge function:', result);
      return result;
    }
    
    console.log('Got Spotify profile data directly from database:', profile);
    const isConnected = !!profile.spotify_username && !!profile.spotify_access_token;
    const isExpired = profile.spotify_token_expires_at ? 
      new Date(profile.spotify_token_expires_at) < new Date() : 
      false;
      
    return {
      connected: isConnected,
      expired: isConnected && isExpired,
      username: profile.spotify_username || null,
    };
  } catch (error) {
    console.error('Error checking Spotify status:', error);
    return { connected: false, expired: false, username: null };
  }
}
