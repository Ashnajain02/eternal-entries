import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';

// Debug logging - can be disabled in production
const DEBUG = false;
const log = (...args: any[]) => DEBUG && console.log('[Spotify]', ...args);

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
  activateElement: () => Promise<void>;
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
  isInitializing: boolean; // NEW: loading state
  isPremium: boolean | null;
  isPlaying: boolean;
  currentClip: ClipPlaybackInfo | null;
  position: number;
  deviceId: string | null;
  needsReauth: boolean;
  playClip: (clip: ClipPlaybackInfo) => Promise<void>;
  pauseClip: () => Promise<void>;
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
  const [isInitializing, setIsInitializing] = useState(false);
  const [isPremium, setIsPremium] = useState<boolean | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentClip, setCurrentClip] = useState<ClipPlaybackInfo | null>(null);
  const [position, setPosition] = useState(0);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [needsReauth, setNeedsReauth] = useState(false);
  
  const playerRef = useRef<SpotifyPlayerInstance | null>(null);
  const accessTokenRef = useRef<string | null>(null);
  const sdkLoadedRef = useRef(false);
  const pendingClipRef = useRef<ClipPlaybackInfo | null>(null);
  const currentClipRef = useRef<ClipPlaybackInfo | null>(null);

  // Keep ref in sync with state for use in callbacks
  useEffect(() => {
    currentClipRef.current = currentClip;
  }, [currentClip]);

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

  // Load Spotify SDK script (lazy - only when needed)
  const loadSpotifySDK = useCallback((): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (sdkLoadedRef.current && window.Spotify) {
        resolve();
        return;
      }

      if (document.getElementById('spotify-player-sdk')) {
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

  // Start playback of a specific clip (internal - called after player is ready)
  const startClipPlayback = useCallback(async (clip: ClipPlaybackInfo): Promise<boolean> => {
    const token = accessTokenRef.current;
    const currentDeviceId = deviceId;
    
    if (!token || !currentDeviceId || !playerRef.current) {
      log('Cannot start playback - missing token/device/player');
      return false;
    }

    try {
      // Set volume for mobile (some devices start muted)
      playerRef.current.setVolume(0.8).catch(() => {});

      // Transfer playback to our device first - AWAIT this to avoid race condition
      const transferResponse = await fetch('https://api.spotify.com/v1/me/player', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          device_ids: [currentDeviceId],
          play: false
        })
      });

      // Small delay to let Spotify register the device transfer
      if (transferResponse.ok) {
        await new Promise(r => setTimeout(r, 100));
      }

      // Start playback
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
        console.error('Failed to start playback:', response.status, errorData);
        
        if (response.status === 401) {
          setNeedsReauth(true);
        } else if (response.status === 403) {
          setIsPremium(false);
        }
        return false;
      }

      log('Playback started successfully');
      setCurrentClip(clip);
      setIsPlaying(true);
      setPosition(clip.clipStartSeconds);
      return true;
    } catch (error) {
      console.error('Error starting playback:', error);
      return false;
    }
  }, [deviceId]);

  // Initialize player (lazy - only called when user taps play)
  const initializePlayer = useCallback(async (): Promise<boolean> => {
    if (playerRef.current && isReady) {
      return true;
    }

    if (isInitializing) {
      // Wait for existing initialization
      return new Promise((resolve) => {
        const checkReady = setInterval(() => {
          if (isReady) {
            clearInterval(checkReady);
            resolve(true);
          }
        }, 100);
        // Timeout after 10 seconds
        setTimeout(() => {
          clearInterval(checkReady);
          resolve(false);
        }, 10000);
      });
    }

    setIsInitializing(true);

    try {
      await loadSpotifySDK();

      const token = await getAccessToken();
      if (!token) {
        setIsInitializing(false);
        return false;
      }

      return new Promise((resolve) => {
        const player = new window.Spotify.Player({
          name: 'Eternal Entries Journal',
          getOAuthToken: async (callback) => {
            const freshToken = await getAccessToken();
            if (freshToken) {
              callback(freshToken);
            }
          },
          volume: 0.8
        });

        // Error handling
        player.addListener('initialization_error', ({ message }) => {
          console.error('Spotify initialization error:', message);
          setIsInitializing(false);
          resolve(false);
        });

        player.addListener('authentication_error', ({ message }) => {
          console.error('Spotify authentication error:', message);
          setNeedsReauth(true);
          setIsInitializing(false);
          resolve(false);
        });

        player.addListener('account_error', ({ message }) => {
          console.error('Spotify account error:', message);
          setIsPremium(false);
          setIsInitializing(false);
          resolve(false);
        });

        player.addListener('playback_error', ({ message }) => {
          console.error('Spotify playback error:', message);
        });

        // Position tracking via SDK events (no polling needed!)
        player.addListener('player_state_changed', (state: SpotifyPlaybackState | null) => {
          if (!state) {
            setIsPlaying(false);
            return;
          }

          const currentPositionSec = Math.floor(state.position / 1000);
          setIsPlaying(!state.paused);
          setPosition(currentPositionSec);

          // Auto-pause at clip end using ref to get current clip value
          const clip = currentClipRef.current;
          if (clip && !state.paused && currentPositionSec >= clip.clipEndSeconds) {
            log('Auto-pausing at clip end');
            player.pause().catch(() => {});
          }
        });

        // Ready
        player.addListener('ready', async ({ device_id }: { device_id: string }) => {
          log('Player ready with device ID:', device_id);
          setDeviceId(device_id);
          setIsReady(true);
          setIsInitializing(false);
          playerRef.current = player;
          resolve(true);

          // If there's a pending clip, play it now
          if (pendingClipRef.current) {
            const clip = pendingClipRef.current;
            pendingClipRef.current = null;
            // Small delay to ensure state is updated
            setTimeout(() => {
              startClipPlayback(clip);
            }, 50);
          }
        });

        // Not Ready
        player.addListener('not_ready', ({ device_id }: { device_id: string }) => {
          log('Player not ready:', device_id);
          setIsReady(false);
        });

        // Connect
        player.connect().then((connected) => {
          if (!connected) {
            console.error('Failed to connect Spotify player');
            setIsInitializing(false);
            resolve(false);
          }
        });
      });
    } catch (error) {
      console.error('Error initializing Spotify player:', error);
      setIsInitializing(false);
      return false;
    }
  }, [isReady, isInitializing, loadSpotifySDK, getAccessToken, startClipPlayback]);

  // Play a clip - main entry point for playback
  const playClip = useCallback(async (clip: ClipPlaybackInfo) => {
    log('playClip called:', clip.entryId);
    
    // CRITICAL FOR MOBILE: Call activateElement SYNCHRONOUSLY before any async
    if (playerRef.current) {
      try {
        playerRef.current.activateElement();
      } catch (e) {
        // activateElement may not exist on all platforms
      }
    }

    // Stop current clip if different
    if (currentClip && currentClip.entryId !== clip.entryId) {
      playerRef.current?.pause().catch(() => {});
    }

    // If player is ready, start playback immediately
    if (isReady && playerRef.current && accessTokenRef.current && deviceId) {
      await startClipPlayback(clip);
      return;
    }

    // Player not ready - store pending clip and initialize
    // Show loading state while initializing
    pendingClipRef.current = clip;
    setCurrentClip(clip); // Set current clip for loading UI
    
    const success = await initializePlayer();
    if (!success) {
      pendingClipRef.current = null;
      setCurrentClip(null);
    }
    // If successful, the 'ready' event handler will trigger playback
  }, [isReady, deviceId, currentClip, initializePlayer, startClipPlayback]);

  // Pause clip
  const pauseClip = useCallback(async () => {
    if (playerRef.current) {
      try {
        await playerRef.current.pause();
      } catch (error) {
        console.error('Error pausing:', error);
      }
    }
    setIsPlaying(false);
  }, []);

  // Cleanup
  const cleanup = useCallback(() => {
    if (playerRef.current) {
      playerRef.current.disconnect();
      playerRef.current = null;
    }

    setIsReady(false);
    setIsInitializing(false);
    setIsPlaying(false);
    setCurrentClip(null);
    setDeviceId(null);
    pendingClipRef.current = null;
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
    isInitializing,
    isPremium,
    isPlaying,
    currentClip,
    position,
    deviceId,
    needsReauth,
    playClip,
    pauseClip,
    cleanup
  };

  return (
    <SpotifyPlaybackContext.Provider value={value}>
      {children}
    </SpotifyPlaybackContext.Provider>
  );
};
