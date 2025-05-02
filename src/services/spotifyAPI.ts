
import { supabase } from '@/integrations/supabase/client';
import { SpotifyTrack } from '@/types';

// Search for Spotify tracks
export async function searchSpotifyTracks(query: string): Promise<SpotifyTrack[]> {
  try {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData.session) {
      console.error("No active Supabase session:", sessionError);
      throw new Error('No active session');
    }

    // Add detailed logging to help debug the request
    console.log("Searching for tracks with query:", query);
    console.log("Using user ID:", sessionData.session.user.id);
    console.log("Request payload:", {
      action: 'search',
      q: query,
      user_id: sessionData.session.user.id
    });
    
    // Search Spotify via our edge function with improved error handling
    const { data, error } = await supabase.functions.invoke('spotify-auth', {
      body: {
        action: 'search', // This matches what the edge function expects
        q: 'coldplay', // Using the parameter name 'q' to match what the function expects
        user_id: sessionData.session.user.id
      },
      // Explicitly add the authorization header to ensure it's being sent correctly
      headers: {
        Authorization: `Bearer ${sessionData.session.access_token}`
      }
    });

    // Detailed logging of the response
    if (data) {
      console.log("Spotify search successful, tracks returned:", data?.tracks?.length || 0);
    }
    
    if (error) {
      console.error('Error from search function:', error);
      
      // Add detailed information about the error object
      console.log("Error details:", {
        message: error.message,
        name: error.name,
        statusCode: error.statusCode,
        stack: error.stack
      });
      
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
