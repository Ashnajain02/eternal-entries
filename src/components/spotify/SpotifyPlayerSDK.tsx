
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SpotifyTrack } from '@/types';
import { Music, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

interface SpotifyPlayerSDKProps {
  track: SpotifyTrack;
  onPlaybackStateChange?: (isPlaying: boolean) => void;
  className?: string;
}

const SpotifyPlayerSDK: React.FC<SpotifyPlayerSDKProps> = ({ 
  track, 
  onPlaybackStateChange,
  className = '' 
}) => {
  const [player, setPlayer] = useState<Spotify.Player | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Function to get Spotify access token
  const getAccessToken = useCallback(async (): Promise<string> => {
    try {
      const { data, error } = await supabase.functions.invoke('spotify-auth', {
        body: { action: 'get_access_token' }
      });
      
      console.log("Spotify token response:", data, error);
      
      if (error || !data?.access_token) {
        throw new Error(error?.message || 'Failed to get Spotify access token');
      }
      
      return data.access_token;
    } catch (error: any) {
      console.error('Failed to get Spotify token:', error);
      throw error;
    }
  }, []);

  // Initialize the Spotify Web Player
  const initializePlayer = useCallback(async () => {
    if (!track?.uri) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      // Load Spotify Player SDK script if not already loaded
      if (!document.getElementById('spotify-player')) {
        const script = document.createElement('script');
        script.id = 'spotify-player';
        script.src = 'https://sdk.scdn.co/spotify-player.js';
        script.async = true;
        document.body.appendChild(script);
      }

      // Create and configure Spotify Player when SDK is ready
      window.onSpotifyWebPlaybackSDKReady = () => {
        const spotifyPlayer = new window.Spotify.Player({
          name: 'Eternal Entries Journal Player',
          getOAuthToken: (callback) => {
            getAccessToken()
              .then(token => callback(token))
              .catch(err => {
                setError('Failed to authorize Spotify player');
                console.error('OAuth token error:', err);
              });
          },
          volume: 0.5
        });

        // Handle player ready event
        spotifyPlayer.addListener('ready', ({ device_id }) => {
          console.log('Spotify Player ready with device ID:', device_id);
          setIsReady(true);
          setIsLoading(false);
        });

        // Handle player not ready event
        spotifyPlayer.addListener('not_ready', ({ device_id }) => {
          console.log('Spotify Player is not ready:', device_id);
        });

        // Handle errors
        spotifyPlayer.addListener('initialization_error', ({ message }) => {
          console.error('Spotify Player initialization error:', message);
          setError(`Initialization error: ${message}`);
          setIsLoading(false);
        });

        spotifyPlayer.addListener('authentication_error', ({ message }) => {
          console.error('Spotify Player authentication error:', message);
          setError(`Authentication error: ${message}`);
          setIsLoading(false);
        });

        spotifyPlayer.addListener('account_error', ({ message }) => {
          console.error('Spotify Player account error:', message);
          setError(`Account error: ${message}`);
          setIsLoading(false);
        });

        // Critical playback state listener for blur/unblur
        spotifyPlayer.addListener('player_state_changed', (state) => {
          console.log('Spotify player state changed:', state);
          
          if (state) {
            // Track is playing - remove blur
            const isCurrentlyPlaying = !state.paused;
            setIsPlaying(isCurrentlyPlaying);
            
            // Notify parent component about playback state
            if (onPlaybackStateChange) {
              onPlaybackStateChange(isCurrentlyPlaying);
            }
          }
        });

        // Connect the player
        spotifyPlayer.connect()
          .then(success => {
            if (!success) {
              setError('Failed to connect to Spotify');
              setIsLoading(false);
            }
          });

        setPlayer(spotifyPlayer);
      };
    } catch (err: any) {
      console.error('Failed to initialize Spotify player:', err);
      setError(`Failed to initialize Spotify player: ${err.message}`);
      setIsLoading(false);
    }
  }, [track?.uri, getAccessToken, onPlaybackStateChange]);

  // Initialize player on component mount
  useEffect(() => {
    initializePlayer();

    // Cleanup on unmount
    return () => {
      if (player) {
        player.disconnect();
      }
    };
  }, [initializePlayer, player]);

  // Handle play/pause
  const togglePlay = async () => {
    try {
      if (!player) {
        throw new Error('Spotify player not initialized');
      }
      
      if (isPlaying) {
        await player.pause();
      } else {
        // If we're not currently playing, we need to start playback with this track
        // This requires making an API call to Spotify
        const token = await getAccessToken();
        
        // Get the current device ID
        const state = await player.getCurrentState();
        
        if (!state) {
          // Open in Spotify app if web playback isn't ready
          openInSpotify();
          return;
        }
        
        await player.resume();
      }
    } catch (err: any) {
      console.error('Error controlling playback:', err);
      toast({
        title: 'Playback Error',
        description: err.message || 'Failed to control playback',
        variant: 'destructive'
      });
      
      // Fallback to opening in Spotify
      openInSpotify();
    }
  };

  const openInSpotify = () => {
    if (track?.uri) {
      window.open(track.uri, '_blank');
    }
  };

  if (!track?.uri) {
    return null;
  }

  // If there's an error, show a link to open in Spotify instead
  if (error) {
    return (
      <div className={`spotify-player-error p-3 bg-muted/50 rounded-md ${className}`}>
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Music className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium">{track.name} • {track.artist}</span>
            </div>
          </div>
          <div className="text-sm text-destructive">{error}</div>
          <Button
            variant="outline"
            size="sm"
            onClick={openInSpotify}
            className="mt-1 flex items-center gap-1"
          >
            Open in Spotify <ExternalLink className="ml-1 h-3 w-3" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`spotify-player ${className}`}>
      <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-md">
        {track.albumArt ? (
          <img
            src={track.albumArt}
            alt={track.album}
            className="h-12 w-12 object-cover rounded-sm"
          />
        ) : (
          <div className="h-12 w-12 bg-muted flex items-center justify-center rounded-sm">
            <Music className="h-6 w-6 text-muted-foreground" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{track.name}</p>
          <p className="text-sm text-muted-foreground truncate">
            {track.artist} • {track.album}
          </p>
        </div>
        <Button
          variant={isPlaying ? "secondary" : "default"} 
          size="sm"
          onClick={togglePlay}
          disabled={isLoading || !isReady}
          className="min-w-[80px]"
        >
          {isLoading ? "Loading..." : isPlaying ? "Pause" : "Play"}
        </Button>
      </div>
    </div>
  );
};

export default SpotifyPlayerSDK;
