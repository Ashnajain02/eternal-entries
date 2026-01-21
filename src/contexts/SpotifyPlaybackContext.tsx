import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';

// Debug logging
const DEBUG = true;
const log = (...args: any[]) => DEBUG && console.log('[Spotify]', ...args);

// Spotify Web Playback SDK types
declare global {
  interface Window {
    Spotify: {
      Player: new (options: SpotifyPlayerOptions) => SpotifyPlayerInstance;
    };
    onSpotifyWebPlaybackSDKReady: () => void;
    __spotifySDKReady?: boolean;
    __spotifySDKReadyPromiseResolvers?: Array<() => void>;
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
  playClip: (clip: ClipPlaybackInfo) => void;
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
  
  // Core state
  const [isReady, setIsReady] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isPremium, setIsPremium] = useState<boolean | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentClip, setCurrentClip] = useState<ClipPlaybackInfo | null>(null);
  const [position, setPosition] = useState(0);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [needsReauth, setNeedsReauth] = useState(false);
  
  // Refs
  const playerRef = useRef<SpotifyPlayerInstance | null>(null);
  const accessTokenRef = useRef<string | null>(null);
  const deviceIdRef = useRef<string | null>(null);
  const sdkLoadedRef = useRef(false);
  const initAttemptedRef = useRef(false);
  const currentClipRef = useRef<ClipPlaybackInfo | null>(null);
  
  // Clip timers
  const clipEndTimeoutRef = useRef<number | null>(null);
  const progressIntervalRef = useRef<number | null>(null);
  const playbackStartTimeRef = useRef<number | null>(null);

  // Sync refs with state
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
        setIsPremium(data.is_premium ?? false);
        return data.access_token;
      }

      return null;
    } catch (error) {
      console.error('Error getting access token:', error);
      return null;
    }
  }, []);

  // Wait for SDK to be ready (script is loaded in index.html)
  const waitForSDK = useCallback((): Promise<void> => {
    return new Promise((resolve) => {
      if (sdkLoadedRef.current && window.Spotify) {
        resolve();
        return;
      }

      if (window.__spotifySDKReady && window.Spotify) {
        log('SDK already ready');
        sdkLoadedRef.current = true;
        resolve();
        return;
      }

      // Register to be notified when SDK is ready
      if (!window.__spotifySDKReadyPromiseResolvers) {
        window.__spotifySDKReadyPromiseResolvers = [];
      }
      window.__spotifySDKReadyPromiseResolvers.push(() => {
        log('SDK ready callback received');
        sdkLoadedRef.current = true;
        resolve();
      });
    });
  }, []);

  // Clear clip timers
  const clearClipTimers = useCallback(() => {
    if (clipEndTimeoutRef.current) {
      window.clearTimeout(clipEndTimeoutRef.current);
      clipEndTimeoutRef.current = null;
    }
    if (progressIntervalRef.current) {
      window.clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    playbackStartTimeRef.current = null;
  }, []);

  // Detach player listeners
  const detachPlayer = useCallback((player: SpotifyPlayerInstance | null) => {
    if (!player) return;
    try {
      player.removeListener('initialization_error');
      player.removeListener('authentication_error');
      player.removeListener('account_error');
      player.removeListener('playback_error');
      player.removeListener('player_state_changed');
      player.removeListener('ready');
      player.removeListener('not_ready');
      player.disconnect();
      log('Player detached');
    } catch {
      // ignore
    }
  }, []);

  // Simple device transfer (no polling)
  const transferPlaybackToDevice = useCallback(async (token: string, targetDeviceId: string): Promise<boolean> => {
    try {
      log('Transferring playback to device:', targetDeviceId);
      const response = await fetch('https://api.spotify.com/v1/me/player', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ device_ids: [targetDeviceId], play: false })
      });
      
      // 204 = success, 404 = no active device (ok for first time)
      const success = response.status === 204 || response.status === 404;
      log('Transfer result:', response.status, success ? '✓' : '✗');
      return success;
    } catch (e) {
      log('Transfer failed:', e);
      return false;
    }
  }, []);

  // Start clip playback
  const startClipPlayback = useCallback(async (clip: ClipPlaybackInfo): Promise<boolean> => {
    const token = accessTokenRef.current;
    const currentDeviceId = deviceIdRef.current;

    if (!token || !currentDeviceId || !playerRef.current) {
      log('Cannot play - missing prerequisites:', {
        hasToken: !!token,
        hasDevice: !!currentDeviceId,
        hasPlayer: !!playerRef.current
      });
      return false;
    }

    try {
      log('▶️ Starting playback:', clip.entryId);
      
      // Clear any existing timers
      clearClipTimers();
      setIsInitializing(true);
      setPosition(clip.clipStartSeconds);

      // Simple transfer before play (best effort, don't block)
      await transferPlaybackToDevice(token, currentDeviceId);

      // Send play command
      const playUrl = `https://api.spotify.com/v1/me/player/play?device_id=${currentDeviceId}`;
      const response = await fetch(playUrl, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          uris: [clip.trackUri],
          position_ms: Math.floor(clip.clipStartSeconds * 1000)
        })
      });

      log('Play response:', response.status);

      if (!response.ok) {
        setIsInitializing(false);
        if (response.status === 401) {
          setNeedsReauth(true);
        } else if (response.status === 403) {
          setIsPremium(false);
        }
        return false;
      }

      // Play command accepted - wait for state change event
      log('✓ Play command accepted');
      return true;
    } catch (error) {
      console.error('Error starting playback:', error);
      setIsInitializing(false);
      return false;
    }
  }, [clearClipTimers, transferPlaybackToDevice]);

  // Initialize player
  const initializePlayer = useCallback(async (): Promise<boolean> => {
    if (playerRef.current && isReady) {
      log('Player already initialized');
      return true;
    }

    if (initAttemptedRef.current) {
      log('Init already attempted this session');
      return false;
    }

    initAttemptedRef.current = true;
    setIsInitializing(true);
    log('Initializing player...');

    try {
      await waitForSDK();

      if (!window.Spotify?.Player) {
        log('SDK not available');
        setIsInitializing(false);
        return false;
      }

      const token = await getAccessToken();
      if (!token) {
        log('No token available');
        setIsInitializing(false);
        return false;
      }

      // Detach any existing player
      if (playerRef.current) {
        detachPlayer(playerRef.current);
        playerRef.current = null;
      }

      log('Creating player...');
      const player = new window.Spotify.Player({
        name: 'Eternal Entries Journal',
        getOAuthToken: async (callback) => {
          const t = accessTokenRef.current ?? (await getAccessToken());
          if (t) callback(t);
        },
        volume: 0.8
      });

      playerRef.current = player;

      // Activate element (for mobile)
      try {
        await player.activateElement();
        log('✓ activateElement succeeded');
      } catch (e) {
        log('activateElement failed (may be ok on desktop):', e);
      }

      // Set up listeners
      player.addListener('initialization_error', ({ message }) => {
        console.error('Spotify init error:', message);
        setIsInitializing(false);
      });

      player.addListener('authentication_error', ({ message }) => {
        console.error('Spotify auth error:', message);
        setNeedsReauth(true);
        setIsInitializing(false);
      });

      player.addListener('account_error', ({ message }) => {
        console.error('Spotify account error:', message);
        setIsPremium(false);
        setIsInitializing(false);
      });

      player.addListener('playback_error', ({ message }) => {
        console.error('Spotify playback error:', message);
      });

      // SIMPLIFIED player_state_changed - no retries, just report state
      player.addListener('player_state_changed', (state: SpotifyPlaybackState | null) => {
        if (!state) {
          log('State: null (not playing on this device)');
          setIsPlaying(false);
          setIsInitializing(false);
          return;
        }

        const clip = currentClipRef.current;
        if (!clip) return;

        const isTrackMatch = state.track_window?.current_track?.uri === clip.trackUri;
        if (!isTrackMatch) return;

        log('State:', state.paused ? 'PAUSED' : 'PLAYING', 'pos:', state.position);

        if (!state.paused) {
          // Playback started!
          if (!playbackStartTimeRef.current) {
            log('🎵 Playback started');
            playbackStartTimeRef.current = performance.now();
            setIsInitializing(false);
            setIsPlaying(true);

            // Start progress timer
            if (progressIntervalRef.current) {
              window.clearInterval(progressIntervalRef.current);
            }
            progressIntervalRef.current = window.setInterval(() => {
              const startTime = playbackStartTimeRef.current;
              if (!startTime) return;
              const elapsed = (performance.now() - startTime) / 1000;
              const newPos = Math.min(clip.clipEndSeconds, clip.clipStartSeconds + elapsed);
              setPosition(newPos);
            }, 200);

            // Schedule clip end
            const durationMs = (clip.clipEndSeconds - clip.clipStartSeconds) * 1000;
            log('Scheduling clip end in', durationMs, 'ms');
            if (clipEndTimeoutRef.current) {
              window.clearTimeout(clipEndTimeoutRef.current);
            }
            clipEndTimeoutRef.current = window.setTimeout(() => {
              log('⏹️ Clip ended');
              player.pause().catch(() => {});
              clearClipTimers();
              setIsPlaying(false);
            }, durationMs);
          }
        } else {
          // Paused
          log('⏸️ Paused');
          clearClipTimers();
          setIsPlaying(false);
          setIsInitializing(false);
        }
      });

      // Ready event
      return new Promise<boolean>((resolve) => {
        player.addListener('ready', ({ device_id }: { device_id: string }) => {
          log('✓ Player ready, deviceId:', device_id);
          deviceIdRef.current = device_id;
          setDeviceId(device_id);
          setIsReady(true);
          setIsInitializing(false);
          resolve(true);
        });

        player.addListener('not_ready', ({ device_id }: { device_id: string }) => {
          log('Player not ready:', device_id);
          setIsReady(false);
        });

        // Connect
        log('Connecting player...');
        player.connect().then((connected) => {
          log('Connect result:', connected);
          if (!connected) {
            setIsInitializing(false);
            resolve(false);
          }
        });
      });
    } catch (error) {
      console.error('Error initializing player:', error);
      setIsInitializing(false);
      return false;
    }
  }, [isReady, waitForSDK, getAccessToken, detachPlayer, clearClipTimers]);

  // Play clip - main entry point
  const playClip = useCallback((clip: ClipPlaybackInfo) => {
    log('playClip called:', clip.entryId);
    
    // Clear any existing playback
    clearClipTimers();
    
    // Stop any other clip
    if (currentClipRef.current && currentClipRef.current.entryId !== clip.entryId && playerRef.current) {
      playerRef.current.pause().catch(() => {});
    }

    // Set current clip
    setCurrentClip(clip);
    setPosition(clip.clipStartSeconds);
    setIsPlaying(false);

    // Activate player element (for mobile gesture)
    if (playerRef.current) {
      try {
        playerRef.current.activateElement();
        log('activateElement called');
      } catch {
        // ignore
      }
    }

    // If ready, play immediately
    if (isReady && playerRef.current && accessTokenRef.current && deviceIdRef.current) {
      log('Player ready - playing immediately');
      void startClipPlayback(clip);
      return;
    }

    // Otherwise initialize first
    log('Player not ready - initializing...');
    setIsInitializing(true);
    
    void initializePlayer().then((success) => {
      if (success && currentClipRef.current?.entryId === clip.entryId) {
        log('Init success - starting playback');
        void startClipPlayback(clip);
      } else {
        log('Init failed or clip changed');
        setIsInitializing(false);
      }
    });
  }, [isReady, clearClipTimers, initializePlayer, startClipPlayback]);

  // Pause clip
  const pauseClip = useCallback(async () => {
    log('pauseClip called');
    clearClipTimers();
    setIsPlaying(false);
    setIsInitializing(false);

    if (playerRef.current) {
      try {
        await playerRef.current.pause();
      } catch (error) {
        console.error('Error pausing:', error);
      }
    }
  }, [clearClipTimers]);

  // Cleanup
  const cleanup = useCallback(() => {
    log('Cleanup');
    clearClipTimers();
    
    if (playerRef.current) {
      detachPlayer(playerRef.current);
      playerRef.current = null;
    }

    accessTokenRef.current = null;
    initAttemptedRef.current = false;

    setIsReady(false);
    setIsInitializing(false);
    setIsPlaying(false);
    setCurrentClip(null);
    setDeviceId(null);
    deviceIdRef.current = null;
  }, [clearClipTimers, detachPlayer]);

  // Prefetch token on auth
  useEffect(() => {
    if (authState.user) {
      getAccessToken().catch(() => {});
    }
  }, [authState.user, getAccessToken]);

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
