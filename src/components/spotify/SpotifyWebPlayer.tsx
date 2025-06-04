
import React, { useEffect, useState, useRef } from 'react';
import { Play, Pause, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SpotifyTrack } from '@/types';
import { supabase } from '@/integrations/supabase/client';

interface SpotifyWebPlayerProps {
  track: SpotifyTrack;
  className?: string;
  onPlayStateChange?: (isPlaying: boolean) => void;
}

declare global {
  interface Window {
    Spotify: any;
    onSpotifyWebPlaybackSDKReady: () => void;
  }
}

const SpotifyWebPlayer: React.FC<SpotifyWebPlayerProps> = ({ 
  track, 
  className = '',
  onPlayStateChange
}) => {
  const [player, setPlayer] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [deviceId, setDeviceId] = useState<string>('');
  const [currentTrack, setCurrentTrack] = useState<any>(null);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [accessToken, setAccessToken] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const playerRef = useRef<any>(null);

  // Get access token and initialize
  useEffect(() => {
    const getAccessToken = async () => {
      try {
        setIsLoading(true);
        console.log('Getting Spotify access token...');
        
        const { data, error } = await supabase.functions.invoke('spotify-auth', {
          body: { action: 'get_token' }
        });

        if (error) {
          console.error('Error from spotify-auth function:', error);
          throw new Error(`Spotify auth error: ${error.message}`);
        }

        if (!data?.access_token) {
          throw new Error('No access token received from Spotify');
        }

        console.log('Successfully got Spotify access token');
        setAccessToken(data.access_token);
        
        // Load SDK after getting token
        loadSpotifySDK(data.access_token);
      } catch (err: any) {
        console.error('Error getting Spotify token:', err);
        setError(`Failed to get Spotify access token: ${err.message}`);
        setIsLoading(false);
      }
    };

    getAccessToken();

    return () => {
      if (playerRef.current) {
        playerRef.current.disconnect();
      }
    };
  }, []);

  const loadSpotifySDK = (token: string) => {
    console.log('Loading Spotify SDK...');
    
    if (window.Spotify) {
      console.log('Spotify SDK already loaded');
      initializePlayer(token);
      return;
    }

    // Check if script is already loading
    if (document.querySelector('script[src*="spotify-player.js"]')) {
      console.log('Spotify SDK script already exists, waiting for load...');
      window.onSpotifyWebPlaybackSDKReady = () => initializePlayer(token);
      return;
    }

    console.log('Adding Spotify SDK script...');
    const script = document.createElement('script');
    script.src = 'https://sdk.scdn.co/spotify-player.js';
    script.async = true;
    document.body.appendChild(script);

    window.onSpotifyWebPlaybackSDKReady = () => {
      console.log('Spotify SDK ready callback triggered');
      initializePlayer(token);
    };
  };

  const initializePlayer = (token: string) => {
    console.log('Initializing Spotify player...');
    
    if (!window.Spotify) {
      console.error('Spotify SDK not available');
      setError('Spotify SDK failed to load');
      setIsLoading(false);
      return;
    }

    try {
      const spotifyPlayer = new window.Spotify.Player({
        name: 'Eternal Entries Player',
        getOAuthToken: (cb: (token: string) => void) => {
          console.log('Providing OAuth token to player');
          cb(token);
        },
        volume: 0.5
      });

      spotifyPlayer.addListener('ready', ({ device_id }: { device_id: string }) => {
        console.log('Spotify player ready with Device ID:', device_id);
        setDeviceId(device_id);
        setIsReady(true);
        setIsLoading(false);
        setError('');
      });

      spotifyPlayer.addListener('not_ready', ({ device_id }: { device_id: string }) => {
        console.log('Spotify player not ready, Device ID:', device_id);
        setIsReady(false);
      });

      spotifyPlayer.addListener('player_state_changed', (state: any) => {
        if (!state) {
          console.log('Player state is null');
          return;
        }

        console.log('Player state changed:', state);
        setCurrentTrack(state.track_window.current_track);
        setIsPlaying(!state.paused);
        setPosition(state.position);
        setDuration(state.duration);

        if (onPlayStateChange) {
          onPlayStateChange(!state.paused);
        }
      });

      spotifyPlayer.addListener('initialization_error', ({ message }: { message: string }) => {
        console.error('Spotify player initialization error:', message);
        setError(`Player initialization failed: ${message}`);
        setIsLoading(false);
      });

      spotifyPlayer.addListener('authentication_error', ({ message }: { message: string }) => {
        console.error('Spotify authentication error:', message);
        setError(`Authentication failed: ${message}`);
        setIsLoading(false);
      });

      spotifyPlayer.addListener('account_error', ({ message }: { message: string }) => {
        console.error('Spotify account error:', message);
        setError('Spotify Premium account required');
        setIsLoading(false);
      });

      spotifyPlayer.addListener('playback_error', ({ message }: { message: string }) => {
        console.error('Spotify playback error:', message);
        setError(`Playback error: ${message}`);
      });

      console.log('Connecting Spotify player...');
      spotifyPlayer.connect().then((success: boolean) => {
        if (success) {
          console.log('Successfully connected to Spotify player');
        } else {
          console.error('Failed to connect to Spotify player');
          setError('Failed to connect to Spotify player');
          setIsLoading(false);
        }
      });

      setPlayer(spotifyPlayer);
      playerRef.current = spotifyPlayer;
    } catch (err: any) {
      console.error('Error initializing Spotify player:', err);
      setError(`Failed to initialize player: ${err.message}`);
      setIsLoading(false);
    }
  };

  const playTrack = async () => {
    if (!deviceId || !accessToken) {
      console.error('Missing deviceId or accessToken for playback');
      return;
    }

    try {
      console.log('Starting playback for track:', track.uri);
      
      const response = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          uris: [track.uri]
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Spotify API error:', response.status, errorData);
        throw new Error(`Spotify API error: ${response.status}`);
      }

      console.log('Successfully started playback');
    } catch (err: any) {
      console.error('Error playing track:', err);
      setError(`Failed to play track: ${err.message}`);
    }
  };

  const togglePlayback = async () => {
    if (!player) {
      console.error('Player not available for playback control');
      return;
    }

    try {
      if (isPlaying) {
        console.log('Pausing playback');
        await player.pause();
      } else {
        // If no track is currently loaded or it's a different track, play the specified track
        if (!currentTrack || currentTrack.uri !== track.uri) {
          console.log('Playing new track');
          await playTrack();
        } else {
          console.log('Resuming playback');
          await player.resume();
        }
      }
    } catch (err: any) {
      console.error('Error toggling playback:', err);
      setError(`Playback control failed: ${err.message}`);
    }
  };

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-md p-4 ${className}`}>
        <p className="text-red-700 text-sm">{error}</p>
        <p className="text-red-600 text-xs mt-2">
          Make sure you have Spotify Premium and have connected your account in Settings.
        </p>
      </div>
    );
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-md p-4 ${className}`}>
      <div className="flex items-center space-x-4">
        {/* Album Art */}
        <div className="flex-shrink-0">
          {track.albumArt ? (
            <img 
              src={track.albumArt} 
              alt={track.album || 'Album art'}
              className="w-16 h-16 rounded-md object-cover"
            />
          ) : (
            <div className="w-16 h-16 bg-gray-200 rounded-md flex items-center justify-center">
              <span className="text-gray-400 text-xs">No Image</span>
            </div>
          )}
        </div>

        {/* Track Info and Controls */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-3">
            {/* Play/Pause Button */}
            <Button
              onClick={togglePlayback}
              disabled={!isReady || isLoading}
              variant="outline"
              size="sm"
              className="flex-shrink-0"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isPlaying && currentTrack?.uri === track.uri ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>

            {/* Track Details */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {track.name}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {track.artist}
              </p>
              {track.album && (
                <p className="text-xs text-gray-400 truncate">
                  {track.album}
                </p>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          {currentTrack?.uri === track.uri && duration > 0 && (
            <div className="mt-2">
              <div className="flex items-center space-x-2 text-xs text-gray-500">
                <span>{formatTime(position)}</span>
                <div className="flex-1 bg-gray-200 rounded-full h-1">
                  <div 
                    className="bg-green-500 h-1 rounded-full transition-all duration-300"
                    style={{ width: `${(position / duration) * 100}%` }}
                  />
                </div>
                <span>{formatTime(duration)}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {isLoading && !error && (
        <div className="mt-2 text-xs text-gray-500 flex items-center">
          <Loader2 className="h-3 w-3 animate-spin mr-1" />
          Connecting to Spotify...
        </div>
      )}
    </div>
  );
};

export default SpotifyWebPlayer;
