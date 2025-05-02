
import { supabase } from '@/integrations/supabase/client';
import { SpotifyTrack } from '@/types';

// Search for Spotify tracks
export async function searchSpotifyTracks(query: string): Promise<SpotifyTrack[]> {
  try {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData.session) {
      throw new Error('No active session');
    }

    // Add logging to help debug the request
    console.log("Searching for tracks with query:", query);
    console.log("Using user ID:", sessionData.session.user.id);
    
    // Search Spotify via our edge function - FIXED ACTION NAME
    const { data, error } = await supabase.functions.invoke('spotify-auth', {
      body: {
        action: 'search', // Changed from 'searchTracks' to 'search' to match what the edge function expects
        q: query, // Using the parameter name 'q' to match what the function expects
        user_id: sessionData.session.user.id
      }
    });

    if (error) {
      console.error('Error from search function:', error);
      
      // Special handling for token expired errors
      if (error.message && (error.message.includes("expired") || error.message.includes("token"))) {
        throw new Error("Spotify session expired, please reconnect your account");
      }
      
      throw new Error(error.message || 'Failed to search Spotify');
    }

    return data?.tracks || [];
  } catch (error) {
    console.error('Error searching Spotify:', error);
    throw error;
  }
}
