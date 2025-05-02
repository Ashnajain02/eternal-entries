
// Create a separate service to handle the Spotify callback
import { supabase } from '@/integrations/supabase/client';

/**
 * Helper function to verify if the Spotify profile data was properly saved
 * @param userId User ID to check
 * @returns Promise resolving to a boolean indicating whether the profile was updated successfully
 */
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

/**
 * Manually update the Spotify profile data as a last resort
 * @param userId User ID to update
 * @param displayName Spotify display name
 * @returns Promise resolving to a boolean indicating success
 */
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
