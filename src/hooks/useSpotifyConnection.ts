import { useState, useEffect, useCallback } from 'react';
import { isSpotifyConnected, initiateSpotifyAuth } from '@/services/spotify';
import { useToast } from '@/hooks/use-toast';
import { SPOTIFY_REDIRECT_KEY } from '@/constants/spotify';

/**
 * Hook for managing Spotify connection state in journal editor context.
 * Handles connection status, auth flow initiation, and redirect recovery.
 */
export function useSpotifyConnection() {
  const [spotifyConnected, setSpotifyConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const { toast } = useToast();

  // Check if Spotify is connected on mount
  useEffect(() => {
    const checkSpotify = async () => {
      const connected = await isSpotifyConnected();
      setSpotifyConnected(connected);
    };
    
    checkSpotify();
  }, []);

  // Check if returning from Spotify auth flow
  useEffect(() => {
    const redirectInfo = localStorage.getItem(SPOTIFY_REDIRECT_KEY);
    if (redirectInfo) {
      localStorage.removeItem(SPOTIFY_REDIRECT_KEY);
      
      // Re-check connection status after returning
      isSpotifyConnected().then(connected => {
        setSpotifyConnected(connected);
        if (connected) {
          toast({
            title: "Spotify connected",
            description: "You can now add songs to your journal entries."
          });
        }
      });
    }
  }, [toast]);

  /**
   * Initiate Spotify connection via popup.
   * Saves draft before initiating if there's content.
   */
  const handleSpotifyConnect = useCallback(async (
    saveImmediately: (entry: any) => void, 
    entryData: any
  ) => {
    // Save draft before initiating auth (in case popup flow fails and user needs to retry)
    if (entryData.content.trim() || entryData.selectedMood !== 'neutral' || entryData.selectedTrack || entryData.weatherData) {
      saveImmediately(entryData);
      localStorage.setItem(SPOTIFY_REDIRECT_KEY, 'journal_editor');
    }
    
    setIsConnecting(true);
    
    const result = await initiateSpotifyAuth();
    
    if (!result.success) {
      setIsConnecting(false);
      
      if (result.popupBlocked) {
        toast({
          title: "Popup Blocked",
          description: "Please enable popups to connect to Spotify.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to connect to Spotify. Please try again.",
          variant: "destructive",
        });
      }
    }
    // Note: isConnecting stays true until user returns from auth flow
    // The useEffect above will handle cleanup when they return
  }, [toast]);

  /**
   * Refresh connection status (call after successful auth)
   */
  const refreshConnectionStatus = useCallback(async () => {
    const connected = await isSpotifyConnected();
    setSpotifyConnected(connected);
    setIsConnecting(false);
    return connected;
  }, []);

  return {
    spotifyConnected,
    isConnecting,
    handleSpotifyConnect,
    refreshConnectionStatus
  };
}
