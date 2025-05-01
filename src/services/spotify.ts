
import { supabase } from '@/integrations/supabase/client';
import { SpotifyTrack } from '@/types';

// URLs for Spotify API calls
const SPOTIFY_AUTH_ENDPOINT = import.meta.env.PROD
  ? 'https://veorhexddrwlwxtkuycb.supabase.co/functions/v1/spotify-auth'
  : 'http://localhost:54321/functions/v1/spotify-auth';

// Interface for connection status
interface SpotifyStatus {
  connected: boolean;
  expired: boolean;
  username: string | null;
}

// Get the Spotify connection status
export async function getSpotifyConnectionStatus(): Promise<SpotifyStatus> {
  try {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData.session) {
      throw new Error('No active session');
    }

    const response = await fetch(`${SPOTIFY_AUTH_ENDPOINT}/status`, {
      headers: {
        Authorization: `Bearer ${sessionData.session.access_token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get Spotify status');
    }

    return await response.json();
  } catch (error) {
    console.error('Error getting Spotify connection status:', error);
    return {
      connected: false,
      expired: false,
      username: null,
    };
  }
}

// Generate the Spotify authorization URL
export function getSpotifyAuthorizationUrl(): string {
  const clientId = 'YOUR_SPOTIFY_CLIENT_ID'; // This will be replaced by an env var in production
  const redirectUri = `${window.location.origin}/spotify-callback`;
  const scopes = [
    'user-read-private',
    'user-read-email',
    'user-read-currently-playing',
    'user-read-playback-state'
  ];

  return `https://accounts.spotify.com/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&scope=${encodeURIComponent(scopes.join(' '))}&show_dialog=true`;
}

// Open Spotify authorization in a new window/tab
export function openSpotifyAuthWindow(): void {
  const authUrl = getSpotifyAuthorizationUrl();
  // Open in a new tab rather than trying to use an iframe which Spotify blocks
  window.open(authUrl, '_blank', 'noopener,noreferrer');
}

// Handle the Spotify OAuth callback
export async function handleSpotifyCallback(code: string): Promise<{ success: boolean; display_name?: string }> {
  try {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData.session) {
      throw new Error('No active session');
    }

    const response = await fetch(`${SPOTIFY_AUTH_ENDPOINT}/callback?code=${code}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${sessionData.session.access_token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to exchange code for token');
    }

    return await response.json();
  } catch (error) {
    console.error('Error handling Spotify callback:', error);
    throw error;
  }
}

// Refresh the Spotify access token
export async function refreshSpotifyToken(): Promise<{ success: boolean; expires_at?: string }> {
  try {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData.session) {
      throw new Error('No active session');
    }

    const response = await fetch(`${SPOTIFY_AUTH_ENDPOINT}/refresh`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${sessionData.session.access_token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to refresh token');
    }

    return await response.json();
  } catch (error) {
    console.error('Error refreshing Spotify token:', error);
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

    const response = await fetch(`${SPOTIFY_AUTH_ENDPOINT}/revoke`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${sessionData.session.access_token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to disconnect Spotify');
    }

    const result = await response.json();
    return result.success === true;
  } catch (error) {
    console.error('Error disconnecting Spotify:', error);
    throw error;
  }
}

// Search for tracks on Spotify
export async function searchSpotifyTracks(query: string): Promise<SpotifyTrack[]> {
  if (!query.trim()) {
    return [];
  }

  try {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData.session) {
      throw new Error('No active session');
    }

    const response = await fetch(`${SPOTIFY_AUTH_ENDPOINT}/search?q=${encodeURIComponent(query)}`, {
      headers: {
        Authorization: `Bearer ${sessionData.session.access_token}`,
      },
    });

    if (!response.ok) {
      // If token is expired, try to refresh it and retry
      if (response.status === 401) {
        try {
          await refreshSpotifyToken();
          // Retry the search with the refreshed token
          return await searchSpotifyTracks(query);
        } catch (refreshError) {
          console.error('Error refreshing token:', refreshError);
          throw new Error('Session expired. Please reconnect to Spotify.');
        }
      }

      const error = await response.json();
      throw new Error(error.error || 'Failed to search Spotify');
    }

    const data = await response.json();
    return data.tracks || [];
  } catch (error) {
    console.error('Error searching Spotify:', error);
    throw error;
  }
}
