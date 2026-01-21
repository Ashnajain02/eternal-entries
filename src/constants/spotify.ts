/**
 * Spotify-related constants used across the application
 */

// LocalStorage key for tracking redirect origin during Spotify OAuth
export const SPOTIFY_REDIRECT_KEY = 'spotify_redirect_from_journal';

// OAuth redirect URI - callback page that handles the Spotify auth response
export const SPOTIFY_REDIRECT_URI = `${window.location.origin}/callback`;
