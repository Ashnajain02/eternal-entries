
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
  const playerRef = useRef<any>(null);

  // Load Spotify SDK
  useEffect(() => {
    const loadSpotifySDK = () => {
      if (window.Spotify) {
        initializePlayer();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://sdk.scdn.co/spotify-player.js';
      script.async = true;
      document.body.appendChild(script);

      window.onSpotifyWebPlaybackSDKReady = () => {
        initializePlayer();
      };
    };

    const getAccessToken = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('spotify-auth', {
          body: { action: 'get_token' }
        });

        if (error || !data?.access_token) {
          throw new Error('No Spotify access token available');
        }

        setAccessToken(data.access_token);
        loadSpotifySDK();
      } catch (err: any) {
        console.error('Error getting Spotify token:', err);
        setError('Failed to get Spotify access token');
      }
    };

    getAccessToken();

    return () => {
      if (playerRef.current) {
        playerRef.current.disconnect();
      }
    };
  }, []);

  const initializePlayer = () => {
    if (!window.Spotify || !accessToken) return;

    const spotifyPlayer = new window.Spotify.Player({
      name: 'Eternal Entries Player',
      getOAuthToken: (cb: (token: string) => void) => {
        cb(accessToken);
      },
      volume: 0.5
    });

    spotifyPlayer.addListener('ready', ({ device_id }: { device_id: string }) => {
      console.log('Ready with Device ID', device_id);
      setDeviceId(device_id);
      setIsReady(true);
    });

    spotifyPlayer.addListener('not_ready', ({ device_id }: { device_id: string }) => {
      console.log('Device ID has gone offline', device_id);
      setIsReady(false);
    });

    spotifyPlayer.addListener('player_state_changed', (state: any) => {
      if (!state) return;

      setCurrentTrack(state.track_window.current_track);
      setIsPlaying(!state.paused);
      setPosition(state.position);
      setDuration(state.duration);

      if (onPlayStateChange) {
        onPlayStateChange(!state.paused);
      }
    });

    spotifyPlayer.addListener('initialization_error', ({ message }: { message: string }) => {
      console.error('Failed to initialize:', message);
      setError('Failed to initialize Spotify player');
    });

    spotifyPlayer.addListener('authentication_error', ({ message }: { message: string }) => {
      console.error('Failed to authenticate:', message);
      setError('Failed to authenticate with Spotify');
    });

    spotifyPlayer.addListener('account_error', ({ message }: { message: string }) => {
      console.error('Failed to validate Spotify account:', message);
      setError('Spotify Premium required');
    });

    spotifyPlayer.connect();
    setPlayer(spotifyPlayer);
    playerRef.current = spotifyPlayer;
  };

  const playTrack = async () => {
    if (!deviceId || !accessToken) return;

    try {
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
        throw new Error('Failed to play track');
      }
    } catch (err) {
      console.error('Error playing track:', err);
      setError('Failed to play track');
    }
  };

  const togglePlayback = async () => {
    if (!player) return;

    try {
      if (isPlaying) {
        await player.pause();
      } else {
        // If no track is currently loaded or it's a different track, play the specified track
        if (!currentTrack || currentTrack.uri !== track.uri) {
          await playTrack();
        } else {
          await player.resume();
        }
      }
    } catch (err) {
      console.error('Error toggling playback:', err);
      setError('Failed to control playback');
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
              disabled={!isReady}
              variant="outline"
              size="sm"
              className="flex-shrink-0"
            >
              {!isReady ? (
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

      {!isReady && !error && (
        <div className="mt-2 text-xs text-gray-500 flex items-center">
          <Loader2 className="h-3 w-3 animate-spin mr-1" />
          Connecting to Spotify...
        </div>
      )}
    </div>
  );
};

export default SpotifyWebPlayer;
