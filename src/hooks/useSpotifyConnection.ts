
import { useState, useEffect } from 'react';
import { isSpotifyConnected } from '@/services/spotify';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

// Key for storing Spotify redirect information
const SPOTIFY_REDIRECT_KEY = 'spotify_redirect_from_journal';

export function useSpotifyConnection() {
  const [spotifyConnected, setSpotifyConnected] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Check if Spotify is connected
  useEffect(() => {
    const checkSpotify = async () => {
      const connected = await isSpotifyConnected();
      setSpotifyConnected(connected);
    };
    
    checkSpotify();
  }, []);

  // Check if we're returning from Spotify auth flow
  useEffect(() => {
    const redirectInfo = localStorage.getItem(SPOTIFY_REDIRECT_KEY);
    if (redirectInfo) {
      localStorage.removeItem(SPOTIFY_REDIRECT_KEY);
      
      toast({
        title: "Spotify connected",
        description: "You can now add songs to your journal entries."
      });
    }
  }, [toast]);

  const handleSpotifyConnect = (saveImmediately: (entry: any) => void, entryData: any) => {
    // Save draft immediately before redirecting
    if (entryData.content.trim() || entryData.selectedMood !== 'neutral' || entryData.selectedTrack || entryData.weatherData) {
      saveImmediately(entryData);
      localStorage.setItem(SPOTIFY_REDIRECT_KEY, 'journal_editor');
    }
    
    navigate('/settings?tab=integrations');
  };

  return {
    spotifyConnected,
    handleSpotifyConnect
  };
}
