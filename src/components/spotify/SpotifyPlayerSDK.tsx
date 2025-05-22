import React, { useEffect, useState, useCallback, useRef } from 'react';
import { SpotifyTrack } from '@/types';
import { getSpotifyAccessToken, loadSpotifyWebPlaybackSDK, createSpotifyTrackURI, extractTrackIdFromURI } from '@/services/spotify';
import { Play, Pause, ExternalLink, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SpotifyPlayerSDKProps {
  track: SpotifyTrack;
  className?: string;
  onPlayStateChange?: (isPlaying: boolean) => void;
}

const SpotifyPlayerSDK: React.FC<SpotifyPlayerSDKProps> = ({
  track,
  className = '',
  onPlayStateChange
}) => {
  const [playerInstance, setPlayerInstance] = useState<Spotify.Player | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const playerNameRef = useRef(`Eternal Entries Player - ${Date.now()}`);
  const trackId = track.uri ? extractTrackIdFromURI(track.uri) : '';

  // Initialize Spotify Web Playback SDK
  useEffect(() => {
    const initializeSpotifySDK = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Load the SDK script
        await loadSpotifyWebPlaybackSDK();
        
        // Get a fresh access token
        const token = await getSpotifyAccessToken();
        if (!token) {
          throw new Error('Failed to get Spotify access token');
        }
        
        // Initialize the player when the SDK is ready
        window.onSpotifyWebPlaybackSDKReady = () => {
          const player = new window.Spotify.Player({
            name: playerNameRef.current,
            getOAuthToken: (callback: (token: string) => void) => {
              // Provide the token to the SDK
              callback(token);
            },
            volume: 0.5
          });
          
          player.addListener('ready', ({ device_id }: { device_id: string }) => {
            console.log('Spotify Web Playback SDK ready with device ID:', device_id);
            setDeviceId(device_id);
            setIsReady(true);
            setIsLoading(false);
          });
          
          player.addListener('not_ready', ({ device_id }: { device_id: string }) => {
            console.log('Spotify Web Playback SDK device has gone offline:', device_id);
            setIsReady(false);
          });
          
          player.addListener('player_state_changed', (state) => {
            if (!state) {
              setIsPlaying(false);
              return;
            }
            
            console.log('Spotify player_state_changed:', state);
            
            // Update playing state
            const newIsPlaying = !state.paused;
            setIsPlaying(newIsPlaying);
            
            // Notify parent component
            if (onPlayStateChange) {
              console.log(`Notifying parent of play state change: ${newIsPlaying}`);
              onPlayStateChange(newIsPlaying);
            }
          });
          
          player.addListener('initialization_error', ({ message }) => {
            console.error('Spotify SDK initialization error:', message);
            setError(`Failed to initialize Spotify player: ${message}`);
            setIsLoading(false);
          });
          
          player.addListener('authentication_error', ({ message }) => {
            console.error('Spotify SDK authentication error:', message);
            setError(`Spotify authentication error: ${message}`);
            setIsLoading(false);
          });
          
          player.addListener('account_error', ({ message }) => {
            console.error('Spotify SDK account error:', message);
            setError(`Spotify account error: ${message}`);
            setIsLoading(false);
          });
          
          // Connect the player
          player.connect();
          setPlayerInstance(player);
        };
      } catch (error: any) {
        console.error('Error setting up Spotify SDK:', error);
        setError(`Failed to initialize Spotify player: ${error.message}`);
        setIsLoading(false);
      }
    };
    
    initializeSpotifySDK();
    
    // Cleanup on component unmount
    return () => {
      if (playerInstance) {
        playerInstance.disconnect();
      }
    };
  }, []);

  // Function to play the current track
  const playTrack = useCallback(async () => {
    if (!deviceId || !isReady || !trackId) {
      console.warn('Cannot play track: player not ready or invalid track');
      return;
    }
    
    try {
      const token = await getSpotifyAccessToken();
      if (!token) {
        throw new Error('Failed to get access token');
      }
      
      // Use Spotify Web API to play the track on our device
      await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uris: [createSpotifyTrackURI(trackId)]
        })
      });
    } catch (error) {
      console.error('Error playing track:', error);
    }
  }, [deviceId, isReady, trackId]);

  // Function to pause the current track
  const pauseTrack = useCallback(async () => {
    if (!playerInstance || !isPlaying) return;
    
    try {
      await playerInstance.pause();
    } catch (error) {
      console.error('Error pausing track:', error);
    }
  }, [playerInstance, isPlaying]);

  // Function to toggle play/pause
  const togglePlayback = useCallback(() => {
    if (isPlaying) {
      pauseTrack();
    } else {
      playTrack();
    }
  }, [isPlaying, pauseTrack, playTrack]);

  // Open track in Spotify
  const openInSpotify = () => {
    if (trackId) {
      window.open(`https://open.spotify.com/track/${trackId}`, '_blank');
    }
  };

  if (!trackId) return null;
  
  return (
    <div className={`spotify-player-sdk flex flex-col p-2 border rounded-md ${className}`}>
      <div className="flex items-center">
        {/* Track info */}
        <div className="flex-grow">
          <div className="font-medium">{track.name}</div>
          <div className="text-sm text-muted-foreground">{track.artist}</div>
        </div>
        
        {/* Player controls */}
        <div className="flex items-center gap-2">
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              <Button 
                size="icon" 
                variant="ghost" 
                onClick={togglePlayback}
                disabled={!isReady || !!error}
              >
                {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
              </Button>
              <Button 
                size="icon" 
                variant="ghost" 
                onClick={openInSpotify}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>
      
      {error && (
        <div className="text-sm text-red-500 mt-2">{error}</div>
      )}
    </div>
  );
};

export default SpotifyPlayerSDK;
