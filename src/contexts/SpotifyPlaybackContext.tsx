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

  // Single-owner clip enforcement + progress (no SDK-driven pause)
  const requestedClipRef = useRef<ClipPlaybackInfo | null>(null);
  const playbackStartedRef = useRef(false);
  const playbackStartPerfMsRef = useRef<number | null>(null);
  const clipEndTimeoutRef = useRef<number | null>(null);
  const progressIntervalRef = useRef<number | null>(null);
  
  // Global audio unlock flag - once unlocked, stays unlocked for the session
  const audioUnlockedRef = useRef(false);

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

  // Load Spotify SDK script - can be called early to preload
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

  // Pre-load SDK on mount so it's ready when user taps
  useEffect(() => {
    loadSpotifySDK().catch(() => {
      // Ignore preload errors - will retry on tap
    });
  }, [loadSpotifySDK]);

  // Clear any active timers/trackers for the currently playing clip
  const clearClipTimers = useCallback(() => {
    if (clipEndTimeoutRef.current) {
      window.clearTimeout(clipEndTimeoutRef.current);
      clipEndTimeoutRef.current = null;
    }
    if (progressIntervalRef.current) {
      window.clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    playbackStartedRef.current = false;
    playbackStartPerfMsRef.current = null;
  }, []);

  // Start playback of a specific clip.
  // IMPORTANT: This does NOT schedule clip-end or progress yet.
  // Those start ONLY when we observe playback actually begin (player_state_changed: paused=false).
  const startClipPlayback = useCallback(async (clip: ClipPlaybackInfo): Promise<boolean> => {
    const token = accessTokenRef.current;
    const currentDeviceId = deviceIdRef.current;

    if (!token || !currentDeviceId || !playerRef.current) {
      log('Cannot start playback - missing token/device/player', {
        token: !!token,
        deviceId: currentDeviceId,
        player: !!playerRef.current
      });
      return false;
    }

    try {
      log('Starting playback for clip:', clip.entryId);

      // Single owner reset
      clearClipTimers();
      requestedClipRef.current = clip;
      playbackStartedRef.current = false;
      setIsPlaying(false);
      setPosition(clip.clipStartSeconds);
      setIsInitializing(true);

      // Set volume (best-effort)
      playerRef.current.setVolume(0.8).catch(() => {});

      // Transfer playback to our device first, then start playback with device_id specified.
      // This ensures Spotify targets our SDK device even if no other device is active.
      const transferResponse = await fetch('https://api.spotify.com/v1/me/player', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          device_ids: [currentDeviceId],
          play: false
        })
      });

      // If transfer fails with 404, the device isn't registered yet - proceed anyway with device_id in play request
      if (!transferResponse.ok && transferResponse.status !== 404) {
        log('Device transfer failed:', transferResponse.status);
      }

      // Start playback at clip start position, explicitly targeting our device
      const response = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${currentDeviceId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          uris: [clip.trackUri],
          position_ms: Math.max(0, Math.floor(clip.clipStartSeconds * 1000))
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to start playback:', response.status, errorData);

        setIsInitializing(false);

        if (response.status === 401) {
          setNeedsReauth(true);
        } else if (response.status === 403) {
          setIsPremium(false);
        }
        return false;
      }

      // We intentionally do NOT set isPlaying=true here.
      // We wait for the SDK state event that confirms playback has actually begun.
      log('Play command accepted; awaiting actual playback start');
      return true;
    } catch (error) {
      console.error('Error starting playback:', error);
      setIsInitializing(false);
      return false;
    }
  }, [clearClipTimers]);

  // Initialize player - returns a promise that resolves when ready
  const initializePlayer = useCallback(async (): Promise<boolean> => {
    // Already ready - fulfill any pending clip immediately
    if (playerRef.current && isReady && deviceIdRef.current) {
      const pendingClip = pendingClipRef.current;
      if (pendingClip) {
        pendingClipRef.current = null;
        log('Already ready - fulfilling pending clip:', pendingClip.entryId);
        // Fire and forget - don't await to keep gesture chain intact
        startClipPlayback(pendingClip);
      }
      return true;
    }

    // Already initializing - return existing promise (pending clip will be handled by ready listener)
    if (initPromiseRef.current) {
      return initPromiseRef.current;
    }

    setIsInitializing(true);

    const initPromise = (async (): Promise<boolean> => {
      try {
        await loadSpotifySDK();

        // CRITICAL: We need to create player inside a user gesture context.
        // Since we've already broken the gesture chain by awaiting above,
        // we prefetch the token but the Spotify Player uses getOAuthToken callback
        // which can fetch async.
        
        // Prefetch token to have it ready (best-effort)
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
              // Use cached token first, then refresh if needed
              if (accessTokenRef.current) {
                callback(accessTokenRef.current);
              } else {
                const freshToken = await getAccessToken();
                if (freshToken) {
                  callback(freshToken);
                }
              }
            },
            volume: 0.8
          });

          // CRITICAL: Store player ref immediately and activate element
          // This might help with mobile audio unlock even though we're async
          playerRef.current = player;
          try {
            player.activateElement();
            log('Called activateElement on new player');
          } catch (e) {
            log('activateElement not available');
          }

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

          // SDK events are READ-ONLY. They must never control playback.
          // We only use this to detect when audio actually begins, then start:
          // - one clip-end timeout
          // - one progress timer
          player.addListener('player_state_changed', (state: SpotifyPlaybackState | null) => {
            if (!state) {
              // No state usually means not playing on this device.
              setIsPlaying(false);
              setIsInitializing(false);
              return;
            }

            const clip = requestedClipRef.current;
            if (!clip) return;

            const isTrackMatch = state.track_window?.current_track?.uri === clip.trackUri;
            if (!isTrackMatch) return;

            // Playback has ACTUALLY begun (first reliable moment to start timers)
            if (!state.paused && !playbackStartedRef.current) {
              playbackStartedRef.current = true;
              playbackStartPerfMsRef.current = performance.now();

              setIsInitializing(false);
              setIsPlaying(true);

              // Start progress timer (single source of truth for UI)
              if (progressIntervalRef.current) {
                window.clearInterval(progressIntervalRef.current);
              }
              progressIntervalRef.current = window.setInterval(() => {
                const startMs = playbackStartPerfMsRef.current;
                if (startMs === null) return;

                const elapsedSec = (performance.now() - startMs) / 1000;
                const nextPos = Math.min(clip.clipEndSeconds, clip.clipStartSeconds + elapsedSec);
                setPosition(nextPos);
              }, 200);

              // Schedule ONE clip-end timeout
              if (clipEndTimeoutRef.current) {
                window.clearTimeout(clipEndTimeoutRef.current);
              }
              const durationMs = Math.max(0, (clip.clipEndSeconds - clip.clipStartSeconds) * 1000);
              clipEndTimeoutRef.current = window.setTimeout(() => {
                // Single pause command per clip
                player.pause().catch(() => {});

                // Stop timers and update state (idempotent)
                if (clipEndTimeoutRef.current) {
                  window.clearTimeout(clipEndTimeoutRef.current);
                  clipEndTimeoutRef.current = null;
                }
                if (progressIntervalRef.current) {
                  window.clearInterval(progressIntervalRef.current);
                  progressIntervalRef.current = null;
                }
                playbackStartedRef.current = false;
                playbackStartPerfMsRef.current = null;
                setIsPlaying(false);
              }, durationMs);

              return;
            }

            // If Spotify reports paused while we thought we were playing, reflect it and stop timers.
            if (state.paused && playbackStartedRef.current) {
              if (clipEndTimeoutRef.current) {
                window.clearTimeout(clipEndTimeoutRef.current);
                clipEndTimeoutRef.current = null;
              }
              if (progressIntervalRef.current) {
                window.clearInterval(progressIntervalRef.current);
                progressIntervalRef.current = null;
              }
              playbackStartedRef.current = false;
              playbackStartPerfMsRef.current = null;
              setIsPlaying(false);
              setIsInitializing(false);
            }
          });

          // Ready - player is usable
          player.addListener('ready', async ({ device_id }: { device_id: string }) => {
            log('Player ready with device ID:', device_id);
            deviceIdRef.current = device_id;
            setDeviceId(device_id);
            setIsReady(true);
            setIsInitializing(false);
            initPromiseRef.current = null;
            resolve(true);

            // If there's a pending clip (from a user tap), start it now.
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

  // CRITICAL: Unlock browser audio SYNCHRONOUSLY within user gesture.
  // This creates a standalone AudioContext and resumes it immediately.
  // Must happen BEFORE any async operations (SDK loading, etc).
  const unlockBrowserAudio = useCallback(() => {
    if (audioUnlockedRef.current) {
      log('Audio already unlocked for this session');
      return;
    }

    log('Unlocking browser audio...');

    // Create and resume AudioContext synchronously
    if (!audioContextRef.current) {
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        log('Created AudioContext, state:', audioContextRef.current.state);
      } catch (e) {
        console.error('Failed to create AudioContext:', e);
      }
    }

    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      // This MUST be called synchronously in the gesture handler
      audioContextRef.current.resume().then(() => {
        log('AudioContext resumed successfully');
      }).catch((e) => {
        console.error('Failed to resume AudioContext:', e);
      });
    }

    // Play a silent buffer to fully unlock audio on iOS/Safari
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        const buffer = audioContextRef.current.createBuffer(1, 1, 22050);
        const source = audioContextRef.current.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContextRef.current.destination);
        source.start(0);
        log('Played silent buffer for iOS unlock');
      } catch (e) {
        // Ignore - best effort
      }
    }

    // If Spotify player already exists, activate its element too
    if (playerRef.current) {
      try {
        playerRef.current.activateElement();
        log('Activated existing Spotify player element');
      } catch (e) {
        // May not exist on all platforms
      }
    }

    audioUnlockedRef.current = true;
    log('Browser audio unlocked for session');
  }, []);

  // Activate Spotify player element - call this when player becomes ready
  // if we have a pending clip from a user gesture
  const activateSpotifyPlayer = useCallback(() => {
    if (playerRef.current) {
      try {
        playerRef.current.activateElement();
        log('Activated Spotify player element');
      } catch (e) {
        // May not exist on all platforms
      }
    }
  }, []);

  // Play a clip - SYNCHRONOUS entry point for mobile gesture chain
  const playClip = useCallback((clip: ClipPlaybackInfo) => {
    log('playClip called:', clip.entryId);

    // CRITICAL: Unlock browser audio SYNCHRONOUSLY in this user gesture
    // This MUST happen before any async operations
    unlockBrowserAudio();

    // Clear timers first
    if (clipEndTimeoutRef.current) {
      window.clearTimeout(clipEndTimeoutRef.current);
      clipEndTimeoutRef.current = null;
    }
    if (progressIntervalRef.current) {
      window.clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    playbackStartedRef.current = false;
    playbackStartPerfMsRef.current = null;

    // CRITICAL: Clear requestedClipRef BEFORE pausing old track.
    // This prevents player_state_changed events from the old track
    // from interfering with our new playback state.
    const wasPlayingDifferentClip = currentClipRef.current && 
      currentClipRef.current.entryId !== clip.entryId && 
      playerRef.current;
    
    // Clear the old clip reference so old state events are ignored
    requestedClipRef.current = null;

    // Mark this clip as active for UI (metadata is already known)
    setCurrentClip(clip);
    pendingClipRef.current = clip;
    setIsPlaying(false);
    setPosition(clip.clipStartSeconds);

    // Helper to actually start the new clip
    const startNewClip = () => {
      // Set the requested clip only after we're ready to start
      requestedClipRef.current = clip;
      
      if (isReady && playerRef.current && accessTokenRef.current && deviceIdRef.current) {
        pendingClipRef.current = null;
        activateSpotifyPlayer();
        void startClipPlayback(clip);
        return;
      }

      // Otherwise, initialize; when ready, it will start the pending clip once.
      void initializePlayer().then((success) => {
        if (!success && pendingClipRef.current?.entryId === clip.entryId) {
          pendingClipRef.current = null;
          setIsInitializing(false);
          setCurrentClip(null);
        }
      });
    };

    // If a different clip is playing, pause it first and wait a moment
    // to let Spotify's state events settle before starting the new track
    if (wasPlayingDifferentClip) {
      log('Pausing previous clip before starting new one');
      playerRef.current!.pause().then(() => {
        // Small delay to let Spotify state settle
        setTimeout(() => {
          startNewClip();
        }, 50);
      }).catch(() => {
        // Even if pause fails, try to start the new clip
        startNewClip();
      });
    } else {
      startNewClip();
    }
  }, [isReady, unlockBrowserAudio, activateSpotifyPlayer, initializePlayer, startClipPlayback]);

  // Pause clip (single pause command + clear timers)
  const pauseClip = useCallback(async () => {
    // Stop timers first so UI becomes stable immediately
    if (clipEndTimeoutRef.current) {
      window.clearTimeout(clipEndTimeoutRef.current);
      clipEndTimeoutRef.current = null;
    }
    if (progressIntervalRef.current) {
      window.clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    playbackStartedRef.current = false;
    playbackStartPerfMsRef.current = null;

    setIsPlaying(false);
    setIsInitializing(false);

    if (playerRef.current) {
      try {
        await playerRef.current.pause();
      } catch (error) {
        console.error('Error pausing:', error);
      }
    }
  }, []);

  // Cleanup
  const cleanup = useCallback(() => {
    // Stop timers
    if (clipEndTimeoutRef.current) {
      window.clearTimeout(clipEndTimeoutRef.current);
      clipEndTimeoutRef.current = null;
    }
    if (progressIntervalRef.current) {
      window.clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    playbackStartedRef.current = false;
    playbackStartPerfMsRef.current = null;
    requestedClipRef.current = null;

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
