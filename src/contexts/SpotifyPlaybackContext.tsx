import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';

// Spotify Web Playback SDK types
declare global {
  interface Window {
    Spotify: {
      Player: new (options: SpotifyPlayerOptions) => SpotifyPlayerInstance;
    };
    onSpotifyWebPlaybackSDKReady: () => void;
  }
}

interface SpotifyPlayerOptions {
  name: string;
  getOAuthToken: (callback: (token: string) => void) => void;
  volume?: number;
}

interface SpotifyPlayerInstance {
  connect: () => Promise<boolean>;
  disconnect: () => void;
  addListener: (event: string, callback: (state: any) => void) => void;
  removeListener: (event: string, callback?: (state: any) => void) => void;
  getCurrentState: () => Promise<SpotifyPlaybackState | null>;
  setVolume: (volume: number) => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  togglePlay: () => Promise<void>;
  seek: (position_ms: number) => Promise<void>;
  previousTrack: () => Promise<void>;
  nextTrack: () => Promise<void>;
  activateElement: () => Promise<void>; // Critical for mobile - must be called from user gesture
}

interface SpotifyPlaybackState {
  paused: boolean;
  position: number;
  duration: number;
  track_window: {
    current_track: {
      id: string;
      uri: string;
      name: string;
      album: { images: { url: string }[] };
      artists: { name: string }[];
    };
  };
}

interface ClipPlaybackInfo {
  entryId: string;
  trackUri: string;
  clipStartSeconds: number;
  clipEndSeconds: number;
}

interface SpotifyPlaybackContextType {
  isReady: boolean;
  isPremium: boolean | null;
  isPlaying: boolean;
  currentClip: ClipPlaybackInfo | null;
  position: number; // current position in seconds
  deviceId: string | null;
  needsReauth: boolean;
  initializePlayer: () => Promise<void>;
  playClip: (clip: ClipPlaybackInfo) => Promise<void>;
  pauseClip: () => Promise<void>;
  togglePlayback: () => Promise<void>;
  cleanup: () => void;
}

const SpotifyPlaybackContext = createContext<SpotifyPlaybackContextType | undefined>(undefined);

export const useSpotifyPlayback = () => {
  const context = useContext(SpotifyPlaybackContext);
  if (!context) {
    throw new Error('useSpotifyPlayback must be used within a SpotifyPlaybackProvider');
  }
  return context;
};

export const SpotifyPlaybackProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { authState } = useAuth();
  const [isReady, setIsReady] = useState(false);
  const [isPremium, setIsPremium] = useState<boolean | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentClip, setCurrentClip] = useState<ClipPlaybackInfo | null>(null);
  const [position, setPosition] = useState(0);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [needsReauth, setNeedsReauth] = useState(false);
  
  const playerRef = useRef<SpotifyPlayerInstance | null>(null);
  const positionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const accessTokenRef = useRef<string | null>(null);
  const sdkLoadedRef = useRef(false);

  // Get access token from edge function
  const getAccessToken = useCallback(async (): Promise<string | null> => {
    try {
      const { data, error } = await supabase.functions.invoke('spotify-playback-token', {
        body: { action: 'get_token' }
      });

      if (error) {
        console.error('Error getting Spotify token:', error);
        return null;
      }

      if (data?.needs_reauth) {
        setNeedsReauth(true);
        return null;
      }

      if (data?.access_token) {
        accessTokenRef.current = data.access_token;
        setIsPremium(data.is_premium ?? null);
        return data.access_token;
      }

      return null;
    } catch (error) {
      console.error('Error getting access token:', error);
      return null;
    }
  }, []);

  // Load Spotify SDK script
  const loadSpotifySDK = useCallback(() => {
    return new Promise<void>((resolve, reject) => {
      if (sdkLoadedRef.current && window.Spotify) {
        resolve();
        return;
      }

      if (document.getElementById('spotify-player-sdk')) {
        // SDK script already exists, wait for it
        if (window.Spotify) {
          sdkLoadedRef.current = true;
          resolve();
        } else {
          window.onSpotifyWebPlaybackSDKReady = () => {
            sdkLoadedRef.current = true;
            resolve();
          };
        }
        return;
      }

      window.onSpotifyWebPlaybackSDKReady = () => {
        sdkLoadedRef.current = true;
        resolve();
      };

      const script = document.createElement('script');
      script.id = 'spotify-player-sdk';
      script.src = 'https://sdk.scdn.co/spotify-player.js';
      script.async = true;
      script.onerror = () => reject(new Error('Failed to load Spotify SDK'));
      document.body.appendChild(script);
    });
  }, []);

  // Initialize player
  const initializePlayer = useCallback(async () => {
    if (playerRef.current) {
      return; // Already initialized
    }

    try {
      await loadSpotifySDK();

      const token = await getAccessToken();
      if (!token) {
        return;
      }

      const player = new window.Spotify.Player({
        name: 'Eternal Entries Journal',
        getOAuthToken: async (callback) => {
          const freshToken = await getAccessToken();
          if (freshToken) {
            callback(freshToken);
          }
        },
        volume: 0.5
      });

      // Error handling
      player.addListener('initialization_error', ({ message }) => {
        console.error('Spotify initialization error:', message);
      });

      player.addListener('authentication_error', ({ message }) => {
        console.error('Spotify authentication error:', message);
        setNeedsReauth(true);
      });

      player.addListener('account_error', ({ message }) => {
        console.error('Spotify account error:', message);
        setIsPremium(false);
      });

      player.addListener('playback_error', ({ message }) => {
        console.error('Spotify playback error:', message);
      });

      // Playback status updates
      player.addListener('player_state_changed', (state: SpotifyPlaybackState | null) => {
        if (!state) {
          setIsPlaying(false);
          return;
        }

        setIsPlaying(!state.paused);
        setPosition(Math.floor(state.position / 1000));
      });

      // Ready
      player.addListener('ready', ({ device_id }: { device_id: string }) => {
        console.log('Spotify player ready with device ID:', device_id);
        setDeviceId(device_id);
        setIsReady(true);
      });

      // Not Ready
      player.addListener('not_ready', ({ device_id }: { device_id: string }) => {
        console.log('Spotify player not ready:', device_id);
        setIsReady(false);
      });

      // Connect
      const connected = await player.connect();
      if (connected) {
        playerRef.current = player;
      } else {
        console.error('Failed to connect Spotify player');
      }
    } catch (error) {
      console.error('Error initializing Spotify player:', error);
    }
  }, [loadSpotifySDK, getAccessToken]);

  // Play a clip - optimized for mobile gesture compliance
  const playClip = useCallback(async (clip: ClipPlaybackInfo) => {
    console.log('[Mobile Debug] playClip called, deviceId:', deviceId, 'hasPlayer:', !!playerRef.current);
    
    // CRITICAL FOR MOBILE: Call activateElement SYNCHRONOUSLY in the gesture handler
    // This must happen BEFORE any async operations to satisfy mobile autoplay policies
    if (playerRef.current) {
      try {
        // This is the key call that enables audio on mobile - must be first!
        playerRef.current.activateElement();
        console.log('[Mobile Debug] activateElement called successfully');
      } catch (e) {
        console.log('[Mobile Debug] activateElement not available or failed:', e);
      }
    }

    // Get current token or fail fast - don't do async init here
    const token = accessTokenRef.current;
    const currentDeviceId = deviceId;
    
    if (!token || !currentDeviceId || !playerRef.current) {
      console.log('[Mobile Debug] No token/device/player, initializing...');
      // Initialize player - this won't play immediately but prepares for next tap
      await initializePlayer();
      return;
    }

    // Stop current clip if different
    if (currentClip && currentClip.entryId !== clip.entryId) {
      if (positionIntervalRef.current) {
        clearInterval(positionIntervalRef.current);
        positionIntervalRef.current = null;
      }
      // Don't await pause - we want to start new playback immediately
      playerRef.current.pause().catch(() => {});
    }

    // Set state optimistically BEFORE the API call for responsive UI
    setCurrentClip(clip);
    setIsPlaying(true);
    setPosition(clip.clipStartSeconds);

    // Set volume explicitly EARLY for mobile (some devices start muted)
    playerRef.current.setVolume(0.8).catch(() => {});

    try {
      console.log('[Mobile Debug] Starting playback on device:', currentDeviceId);
      
      // Transfer playback to our device - don't await, fire and continue
      fetch(`https://api.spotify.com/v1/me/player`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          device_ids: [currentDeviceId],
          play: false
        })
      }).catch(() => {});

      // Start playback via Spotify API
      const response = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${currentDeviceId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          uris: [clip.trackUri],
          position_ms: clip.clipStartSeconds * 1000
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[Mobile Debug] Failed to start playback:', response.status, errorData);
        
        // Reset state on failure
        setIsPlaying(false);
        setCurrentClip(null);
        
        if (response.status === 401) {
          setNeedsReauth(true);
        } else if (response.status === 403) {
          setIsPremium(false);
        }
        return;
      }

      console.log('[Mobile Debug] Playback API call succeeded');

      // Start position tracking
      if (positionIntervalRef.current) {
        clearInterval(positionIntervalRef.current);
      }

      positionIntervalRef.current = setInterval(async () => {
        if (playerRef.current) {
          const state = await playerRef.current.getCurrentState();
          if (state) {
            const currentPositionSec = Math.floor(state.position / 1000);
            setPosition(currentPositionSec);

            // Auto-pause at clip end - inline to avoid circular dependency
            if (currentPositionSec >= clip.clipEndSeconds) {
              if (positionIntervalRef.current) {
                clearInterval(positionIntervalRef.current);
                positionIntervalRef.current = null;
              }
              playerRef.current?.pause().catch(() => {});
              setIsPlaying(false);
              console.log('[Mobile Debug] Auto-paused at clip end');
            }
          }
        }
      }, 500);
    } catch (error) {
      console.error('[Mobile Debug] Error playing clip:', error);
      setIsPlaying(false);
      setCurrentClip(null);
    }
  }, [deviceId, currentClip, initializePlayer]);

  // Pause clip
  const pauseClip = useCallback(async () => {
    if (positionIntervalRef.current) {
      clearInterval(positionIntervalRef.current);
      positionIntervalRef.current = null;
    }

    if (playerRef.current) {
      try {
        await playerRef.current.pause();
      } catch (error) {
        console.error('Error pausing:', error);
      }
    }

    setIsPlaying(false);
  }, []);

  // Toggle playback
  const togglePlayback = useCallback(async () => {
    if (!currentClip) return;

    if (isPlaying) {
      await pauseClip();
    } else {
      await playClip(currentClip);
    }
  }, [isPlaying, currentClip, pauseClip, playClip]);

  // Cleanup
  const cleanup = useCallback(() => {
    if (positionIntervalRef.current) {
      clearInterval(positionIntervalRef.current);
      positionIntervalRef.current = null;
    }

    if (playerRef.current) {
      playerRef.current.disconnect();
      playerRef.current = null;
    }

    setIsReady(false);
    setIsPlaying(false);
    setCurrentClip(null);
    setDeviceId(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  // Cleanup when user logs out
  useEffect(() => {
    if (!authState.user) {
      cleanup();
    }
  }, [authState.user, cleanup]);

  const value: SpotifyPlaybackContextType = {
    isReady,
    isPremium,
    isPlaying,
    currentClip,
    position,
    deviceId,
    needsReauth,
    initializePlayer,
    playClip,
    pauseClip,
    togglePlayback,
    cleanup
  };

  return (
    <SpotifyPlaybackContext.Provider value={value}>
      {children}
    </SpotifyPlaybackContext.Provider>
  );
};
