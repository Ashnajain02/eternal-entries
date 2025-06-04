import React, { useState, useEffect, useRef } from 'react';
import { SpotifyTrack } from '@/types';
import { Button } from '@/components/ui/button';
import { Play, Pause } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

declare global {
  interface Window {
    onSpotifyWebPlaybackSDKReady: () => void;
    Spotify: {
      Player: new (options: {
        name: string;
        getOAuthToken: (cb: (token: string) => void) => void;
        volume: number;
      }) => SpotifyPlayer;
    };
  }
}

interface SpotifyPlayer {
  addListener: (event: string, callback: (...args: any[]) => void) => void;
  connect: () => Promise<boolean>;
  disconnect: () => void;
  getCurrentState: () => Promise<any>;
  getVolume: () => Promise<number>;
  nextTrack: () => Promise<void>;
  pause: () => Promise<void>;
  previousTrack: () => Promise<void>;
  resume: () => Promise<void>;
  seek: (position: number) => Promise<void>;
  setName: (name: string) => Promise<void>;
  setVolume: (volume: number) => Promise<void>;
  togglePlay: () => Promise<void>;
}

interface SpotifyWebPlayerProps {
  track: SpotifyTrack;
  className?: string;
  onPlayStateChange?: (isPlaying: boolean) => void;
}

const SpotifyWebPlayer: React.FC<SpotifyWebPlayerProps> = ({ 
  track, 
  className = '', 
  onPlayStateChange 
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const playerRef = useRef<SpotifyPlayer | null>(null);

  // Extract track ID from URI
  const trackId = track.uri ? track.uri.split(':').pop() : '';

  // Load Spotify Web Playback SDK
  useEffect(() => {
    if (window.Spotify) {
      setIsSDKLoaded(true);
      return;
    }

    window.onSpotifyWebPlaybackSDKReady = () => {
      setIsSDKLoaded(true);
    };

    const script = document.createElement('script');
    script.src = 'https://sdk.scdn.co/spotify-player.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  // Get access token
  useEffect(() => {
    const getAccessToken = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session) return;

        const { data } = await supabase.functions.invoke('spotify-auth', {
          body: { action: 'get_token' }
        });

        if (data?.access_token) {
          setAccessToken(data.access_token);
        }
      } catch (error) {
        console.error('Error getting Spotify token:', error);
      }
    };

    getAccessToken();
  }, []);

  // Initialize player when SDK is loaded and token is available
  useEffect(() => {
    if (!isSDKLoaded || !accessToken || !window.Spotify) return;

    const player = new window.Spotify.Player({
      name: 'Eternal Entries Player',
      getOAuthToken: (cb) => {
        cb(accessToken);
      },
      volume: 0.5
    });

    // Error handling
    player.addListener('initialization_error', ({ message }) => {
      console.error('Failed to initialize:', message);
    });

    player.addListener('authentication_error', ({ message }) => {
      console.error('Failed to authenticate:', message);
    });

    player.addListener('account_error', ({ message }) => {
      console.error('Failed to validate Spotify account:', message);
    });

    player.addListener('playback_error', ({ message }) => {
      console.error('Failed to perform playback:', message);
    });

    // Playback status updates
    player.addListener('player_state_changed', (state) => {
      if (!state) return;

      const isCurrentlyPlaying = !state.paused;
      setIsPlaying(isCurrentlyPlaying);
      
      if (onPlayStateChange) {
        onPlayStateChange(isCurrentlyPlaying);
      }
    });

    // Ready
    player.addListener('ready', ({ device_id }) => {
      console.log('Ready with Device ID', device_id);
      setDeviceId(device_id);
      setIsReady(true);
    });

    // Not Ready
    player.addListener('not_ready', ({ device_id }) => {
      console.log('Device ID has gone offline', device_id);
      setIsReady(false);
    });

    // Connect to the player
    player.connect().then(success => {
      if (success) {
        console.log('Successfully connected to Spotify!');
      }
    });

    playerRef.current = player;

    return () => {
      player.disconnect();
    };
  }, [isSDKLoaded, accessToken, onPlayStateChange]);

  const playTrack = async () => {
    if (!deviceId || !accessToken || !trackId) return;

    try {
      const response = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
        method: 'PUT',
        body: JSON.stringify({
          uris: [`spotify:track:${trackId}`]
        }),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
      });

      if (!response.ok) {
        console.error('Failed to play track');
      }
    } catch (error) {
      console.error('Error playing track:', error);
    }
  };

  const togglePlayback = async () => {
    if (!playerRef.current) return;

    try {
      if (isPlaying) {
        await playerRef.current.pause();
      } else {
        // If not playing, start the track
        await playTrack();
      }
    } catch (error) {
      console.error('Error toggling playback:', error);
    }
  };

  // Fallback to iframe if SDK fails or not ready
  if (!isSDKLoaded || !isReady || !deviceId) {
    return (
      <div className={`spotify-player ${className}`}>
        <iframe
          src={`https://open.spotify.com/embed/track/${trackId}`}
          width="100%"
          height="80"
          frameBorder="0"
          allow="encrypted-media"
          loading="lazy"
          className="rounded-md"
        />
      </div>
    );
  }

  return (
    <div className={`spotify-player bg-black text-white p-4 rounded-md ${className}`}>
      <div className="flex items-center space-x-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={togglePlayback}
          className="text-white hover:text-green-400"
        >
          {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
        </Button>
        
        <div className="flex-1">
          <div className="text-sm font-medium">{track.name}</div>
          <div className="text-xs text-gray-400">{track.artist}</div>
        </div>
      </div>
    </div>
  );
};

export default SpotifyWebPlayer;
