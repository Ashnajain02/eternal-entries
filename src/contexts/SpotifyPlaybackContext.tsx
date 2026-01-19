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
  isInitializing: boolean;
  isPremium: boolean | null;
  isPlaying: boolean;
  currentClip: ClipPlaybackInfo | null;
  position: number;
  deviceId: string | null;
  needsReauth: boolean;
  playClip: (clip: ClipPlaybackInfo) => void; // Changed to sync for gesture chain
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
  const deviceIdRef = useRef<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const initPromiseRef = useRef<Promise<boolean> | null>(null);

  // Keep refs in sync with state for use in callbacks
  useEffect(() => {
    currentClipRef.current = currentClip;
  }, [currentClip]);

  useEffect(() => {
    deviceIdRef.current = deviceId;
  }, [deviceId]);

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
    const currentDeviceId = deviceIdRef.current;
    
    if (!token || !currentDeviceId || !playerRef.current) {
      log('Cannot start playback - missing token/device/player', { token: !!token, deviceId: currentDeviceId, player: !!playerRef.current });
      return false;
    }

    try {
      log('Starting playback for clip:', clip.entryId);
      
      // Set volume
      playerRef.current.setVolume(0.8).catch(() => {});

      // Transfer playback to our device first
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

      if (transferResponse.ok) {
        await new Promise(r => setTimeout(r, 100));
      }

      // Start playback at clip start position
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
  }, []);

  // Initialize player - returns a promise that resolves when ready
  const initializePlayer = useCallback(async (): Promise<boolean> => {
    // Already ready
    if (playerRef.current && isReady && deviceIdRef.current) {
      return true;
    }

    // Already initializing - return existing promise
    if (initPromiseRef.current) {
      return initPromiseRef.current;
    }

    setIsInitializing(true);

    const initPromise = (async (): Promise<boolean> => {
      try {
        await loadSpotifySDK();

        const token = await getAccessToken();
        if (!token) {
          setIsInitializing(false);
          initPromiseRef.current = null;
          return false;
        }

        return new Promise<boolean>((resolve) => {
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
            initPromiseRef.current = null;
            resolve(false);
          });

          player.addListener('authentication_error', ({ message }) => {
            console.error('Spotify authentication error:', message);
            setNeedsReauth(true);
            setIsInitializing(false);
            initPromiseRef.current = null;
            resolve(false);
          });

          player.addListener('account_error', ({ message }) => {
            console.error('Spotify account error:', message);
            setIsPremium(false);
            setIsInitializing(false);
            initPromiseRef.current = null;
            resolve(false);
          });

          player.addListener('playback_error', ({ message }) => {
            console.error('Spotify playback error:', message);
          });

          // Position tracking via SDK events
          player.addListener('player_state_changed', (state: SpotifyPlaybackState | null) => {
            if (!state) {
              setIsPlaying(false);
              return;
            }

            const currentPositionSec = Math.floor(state.position / 1000);
            setIsPlaying(!state.paused);
            setPosition(currentPositionSec);

            // Auto-pause at clip end
            const clip = currentClipRef.current;
            if (clip && !state.paused && currentPositionSec >= clip.clipEndSeconds) {
              log('Auto-pausing at clip end');
              player.pause().catch(() => {});
            }
          });

          // Ready - player is usable
          player.addListener('ready', async ({ device_id }: { device_id: string }) => {
            log('Player ready with device ID:', device_id);
            deviceIdRef.current = device_id;
            setDeviceId(device_id);
            setIsReady(true);
            setIsInitializing(false);
            playerRef.current = player;
            initPromiseRef.current = null;
            resolve(true);

            // If there's a pending clip, play it now
            const pendingClip = pendingClipRef.current;
            if (pendingClip) {
              pendingClipRef.current = null;
              log('Playing pending clip:', pendingClip.entryId);
              startClipPlayback(pendingClip);
            }
          });

          // Not Ready
          player.addListener('not_ready', ({ device_id }: { device_id: string }) => {
            log('Player not ready:', device_id);
            setIsReady(false);
          });

          // Connect to Spotify
          player.connect().then((connected) => {
            if (!connected) {
              console.error('Failed to connect Spotify player');
              setIsInitializing(false);
              initPromiseRef.current = null;
              resolve(false);
            }
          });
        });
      } catch (error) {
        console.error('Error initializing Spotify player:', error);
        setIsInitializing(false);
        initPromiseRef.current = null;
        return false;
      }
    })();

    initPromiseRef.current = initPromise;
    return initPromise;
  }, [isReady, loadSpotifySDK, getAccessToken, startClipPlayback]);

  // CRITICAL: Activate audio context synchronously on user gesture
  // This must be called SYNCHRONOUSLY within the click/tap handler
  const activateAudioContext = useCallback(() => {
    // Create or resume AudioContext to satisfy browser autoplay policy
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume().catch(() => {});
    }
    
    // Also activate Spotify player element if it exists
    if (playerRef.current) {
      try {
        playerRef.current.activateElement();
      } catch (e) {
        // May not exist on all platforms
      }
    }
  }, []);

  // Play a clip - SYNCHRONOUS entry point for mobile gesture chain
  const playClip = useCallback((clip: ClipPlaybackInfo) => {
    log('playClip called:', clip.entryId);
    
    // STEP 1: SYNCHRONOUSLY activate audio (critical for mobile)
    activateAudioContext();
    
    // STEP 2: If a different clip is playing, pause it
    if (currentClipRef.current && currentClipRef.current.entryId !== clip.entryId && playerRef.current) {
      playerRef.current.pause().catch(() => {});
    }

    // STEP 3: Set UI state immediately (for loading indicator)
    setCurrentClip(clip);
    pendingClipRef.current = clip;

    // STEP 4: If player is ready, start playback immediately
    if (isReady && playerRef.current && accessTokenRef.current && deviceIdRef.current) {
      pendingClipRef.current = null;
      startClipPlayback(clip);
      return;
    }

    // STEP 5: Player not ready - initialize (async, but audio context already activated)
    initializePlayer().then((success) => {
      if (!success && pendingClipRef.current?.entryId === clip.entryId) {
        pendingClipRef.current = null;
        setCurrentClip(null);
      }
      // If successful, the 'ready' handler will call startClipPlayback with pendingClipRef
    });
  }, [isReady, activateAudioContext, initializePlayer, startClipPlayback]);

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

    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }

    setIsReady(false);
    setIsInitializing(false);
    setIsPlaying(false);
    setCurrentClip(null);
    setDeviceId(null);
    deviceIdRef.current = null;
    pendingClipRef.current = null;
    initPromiseRef.current = null;
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
