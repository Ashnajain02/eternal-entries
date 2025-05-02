
import { supabase } from '@/integrations/supabase/client';
import { SpotifyTrack } from '@/types';

// Search for Spotify tracks
export async function searchSpotifyTracks(query: string): Promise<SpotifyTrack[]> {
  try {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData.session) {
      throw new Error('No active session');
    }

    // Search Spotify via our edge function
    const response = await fetch(`https://veorhexddrwlwxtkuycb.functions.supabase.co/spotify-auth/search?q=${encodeURIComponent(query)}`, {
      headers: {
        Authorization: `Bearer ${sessionData.session.access_token}`,
      },
      cache: 'no-store', // Prevent caching
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response from search endpoint:', errorText);
      
      try {
        const error = JSON.parse(errorText);
        // Special handling for token expired errors
        if (error.error && (error.error.includes("expired") || error.error.includes("token"))) {
          throw new Error("Spotify session expired, please reconnect your account");
        }
        throw new Error(error.error || 'Failed to search Spotify');
      } catch (e) {
        if (e instanceof SyntaxError) {
          throw new Error(`Failed to process response: ${errorText}`);
        }
        throw e;
      }
    }

    const { tracks } = await response.json();
    return tracks;
  } catch (error) {
    console.error('Error searching Spotify:', error);
    throw error;
  }
}
