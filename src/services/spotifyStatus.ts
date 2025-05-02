
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

    const userId = sessionData.session.user.id;
    console.log('Found active session for user:', userId);

    // Add a cache-busting timestamp to ensure we get fresh data
    const timestamp = new Date().getTime();
    
    try {
      // Direct database query with cache prevention
      console.log(`Attempting direct database query for Spotify profile data for userId: ${userId}...`);
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('spotify_username, spotify_token_expires_at, spotify_access_token')
        .eq('id', userId)
        .single();
      
      if (profileError) {
        console.error('Error fetching Spotify profile data:', profileError);
        
        // Check if the profile exists at all
        const { count, error: countError } = await supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('id', userId);
          
        if (countError) {
          console.error('Error checking if profile exists:', countError);
        } else {
          console.log(`Profile existence check for user ${userId}: ${count === 1 ? 'EXISTS' : 'DOES NOT EXIST'}`);
          
          if (count === 0) {
            // Profile doesn't exist, create it
            console.log('Profile does not exist, creating it now');
            
            const { error: insertError } = await supabase
              .from('profiles')
              .insert([{ id: userId }]);
              
            if (insertError) {
              console.error('Failed to create missing profile:', insertError);
            } else {
              console.log('Created new profile for user');
              
              // Retry fetching the profile after creating it
              const { data: retryProfile, error: retryError } = await supabase
                .from('profiles')
                .select('spotify_username, spotify_token_expires_at, spotify_access_token')
                .eq('id', userId)
                .single();
                
              if (retryError) {
                console.error('Error fetching profile after creation:', retryError);
              } else if (retryProfile) {
                console.log('Got profile data after creation:', {
                  username: retryProfile.spotify_username,
                  hasToken: !!retryProfile.spotify_access_token,
                  expiresAt: retryProfile.spotify_token_expires_at
                });
                
                const isConnected = !!retryProfile.spotify_username && !!retryProfile.spotify_access_token;
                const isExpired = retryProfile.spotify_token_expires_at ? 
                  new Date(retryProfile.spotify_token_expires_at) < new Date() : 
                  false;
                  
                return {
                  connected: isConnected,
                  expired: isConnected && isExpired,
                  username: retryProfile.spotify_username || null,
                };
              }
            }
          }
        }
      } else if (profile) {
        console.log('Got Spotify profile data from database:', {
          username: profile.spotify_username,
          hasToken: !!profile.spotify_access_token,
          expiresAt: profile.spotify_token_expires_at,
          userId: userId
        });
        
        const isConnected = !!profile.spotify_username && !!profile.spotify_access_token;
        const isExpired = profile.spotify_token_expires_at ? 
          new Date(profile.spotify_token_expires_at) < new Date() : 
          false;
          
        console.log('Spotify connection status result:', {
          connected: isConnected,
          expired: isExpired,
          username: profile.spotify_username
        });
        
        return {
          connected: isConnected,
          expired: isConnected && isExpired,
          username: profile.spotify_username || null,
        };
      } else {
        console.log('No profile data returned despite successful query');
      }
    } catch (dbError) {
      console.warn('Error fetching Spotify info from database:', dbError);
    }
    
    // Fallback to edge function if direct database query fails
    try {
      console.log(`Calling edge function for Spotify status with timestamp: ${timestamp}`);
      
      const { data, error } = await supabase.functions.invoke('spotify-auth', {
        body: {
          action: 'status',
          t: timestamp,
          user_id: sessionData.session.user.id
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
    }

    // If all methods fail, assume not connected
    return { connected: false, expired: false, username: null };
  } catch (error) {
    console.error('Error checking Spotify status:', error);
    return { connected: false, expired: false, username: null };
  }
}
