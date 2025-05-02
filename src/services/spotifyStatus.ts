
import { supabase } from '@/integrations/supabase/client';

// Check connection status with Spotify - improved with direct database query and fallback mechanisms
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

    try {
      // First try a direct database query - this is the most reliable method
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('spotify_username, spotify_token_expires_at, spotify_access_token')
        .eq('id', sessionData.session.user.id)
        .single();
      
      if (!profileError && profile) {
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
      } else {
        console.log('No profile data from direct query, trying fallback');
      }
    } catch (dbError) {
      console.warn('Error fetching Spotify info from database:', dbError);
      // Continue to fallback
    }

    // Instead of using RPC, we'll make a direct database query or use the edge function
    // Remove the problematic RPC call that was causing TypeScript errors
    
    // Skip directly to edge function fallback with timeout and failure handling
    try {
      const timestamp = new Date().getTime(); // Add timestamp to prevent caching
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
      
      const response = await fetch(
        `https://veorhexddrwlwxtkuycb.functions.supabase.co/spotify-auth/status?t=${timestamp}`, 
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${sessionData.session.access_token}`,
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          },
          signal: controller.signal
        }
      );
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const result = await response.json();
        console.log('Received Spotify status from edge function:', result);
        return result;
      } else {
        throw new Error(`Edge function returned status: ${response.status}`);
      }
    } catch (fetchError) {
      console.error('Edge function fallback failed:', fetchError);
      // All methods failed, return disconnected state
    }

    // If all methods fail, assume not connected
    return { connected: false, expired: false, username: null };
  } catch (error) {
    console.error('Error checking Spotify status:', error);
    return { connected: false, expired: false, username: null };
  }
}
