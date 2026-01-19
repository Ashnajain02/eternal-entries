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
  const [tokenEpoch, setTokenEpoch] = useState(0);
  
  const playerRef = useRef<SpotifyPlayerInstance | null>(null);
  const accessTokenRef = useRef<string | null>(null);
  const playerTokenRef = useRef<string | null>(null);
  const sdkLoadedRef = useRef(false);
  const pendingClipRef = useRef<ClipPlaybackInfo | null>(null);
  const currentClipRef = useRef<ClipPlaybackInfo | null>(null);
  const deviceIdRef = useRef<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const initPromiseRef = useRef<Promise<boolean> | null>(null);

  // Playback activation:
  // Spotify may not expose a Web Playback SDK device to the Web API until the first successful
  // /v1/me/player/play. We therefore allow exactly one first-play attempt immediately after
  // SDK ready, with a single short retry on 404 (Device not found).
  const playbackActivatedRef = useRef(false);


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
      // Hard requirement: never fetch/use a Spotify token until a Supabase session exists.
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) return null;

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
        const nextToken: string = data.access_token;
        const prevToken: string | null = accessTokenRef.current;

        accessTokenRef.current = nextToken;
        setIsPremium(data.is_premium ?? null);

        // Track token changes so we can rebuild the SDK Player if needed.
        if (prevToken && prevToken !== nextToken) {
          setTokenEpoch((e) => e + 1);
        }

        return nextToken;
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

  // Prefetch access token early (async) so first tap doesn't spend time fetching
  useEffect(() => {
    if (!authState.user) return;
    getAccessToken().catch(() => {
      // Best-effort
    });
  }, [authState.user, getAccessToken]);

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

  // NOTE (device registration race):
  // We intentionally do NOT gate first playback on /v1/me/player/devices or is_active.
  // Some Spotify accounts/environments only surface the SDK device to /devices AFTER the first
  // successful /play. Gating on /devices would deadlock first playback.

  // Start playback of a specific clip.
  // IMPORTANT: This does NOT schedule clip-end or progress yet.
  // Those start ONLY when we observe playback actually begin (player_state_changed: paused=false).
  const startClipPlayback = useCallback(async (clip: ClipPlaybackInfo): Promise<boolean> => {
    const token = accessTokenRef.current ?? (await getAccessToken());
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

      const sleep = (ms: number) => new Promise((r) => window.setTimeout(r, ms));

      const sendPlay = async (): Promise<Response> => {
        return fetch(`https://api.spotify.com/v1/me/player/play?device_id=${currentDeviceId}`, {
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
      };

      // First-play must be allowed immediately after SDK ready.
      // If Spotify returns 404 (Device not found) on the very first attempt, retry ONCE shortly.
      let response = await sendPlay();

      if (!response.ok && response.status === 404 && !playbackActivatedRef.current) {
        await response.json().catch(() => ({})); // drain body (best-effort)
        await sleep(400);
        response = await sendPlay();
      }

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

      // Mark activation after the first successful /play.
      playbackActivatedRef.current = true;

      // We intentionally do NOT set isPlaying=true here.
      // We wait for the SDK state event that confirms playback has actually begun.
      log('Play command accepted; awaiting actual playback start');
      return true;
    } catch (error) {
      console.error('Error starting playback:', error);
      setIsInitializing(false);
      return false;
    }
  }, [clearClipTimers, getAccessToken]);



  // Core player initialization that does NOT await anything before creating the Player.
  // This allows us to create + activate the Spotify element inside the user's tap (mobile requirement).
  const initializePlayerCore = useCallback((): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      void (async () => {
        if (!window.Spotify?.Player) {
          log('Spotify SDK not available yet');
          setIsInitializing(false);
          initPromiseRef.current = null;
          resolve(false);
          return;
        }

        // REQUIRED: never construct Spotify.Player until we have a valid access token.
        const tokenForPlayer = accessTokenRef.current ?? (await getAccessToken());
        if (!tokenForPlayer) {
          setIsInitializing(false);
          initPromiseRef.current = null;
          resolve(false);
          return;
        }

        playerTokenRef.current = tokenForPlayer;

        const player = new window.Spotify.Player({
          name: 'Eternal Entries Journal',
          getOAuthToken: async (callback) => {
            const token = accessTokenRef.current ?? (await getAccessToken());
            if (token) callback(token);
          },
          volume: 0.8
        });

        // Store player ref immediately
        playerRef.current = player;

      // IMPORTANT: On iOS, this must be invoked from a user gesture.
      // When initializePlayerCore is called from playClip, that's exactly what happens.
      try {
        void player.activateElement();
        log('Called activateElement on player');
      } catch {
        // Not supported on all platforms
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
      player.addListener('ready', ({ device_id }: { device_id: string }) => {
        log('Player ready with device ID:', device_id);

        // New device -> reset activation flag
        playbackActivatedRef.current = false;

        deviceIdRef.current = device_id;
        setDeviceId(device_id);
        setIsReady(true);
        setIsInitializing(false);
        initPromiseRef.current = null;
        resolve(true);

        // If the user tapped play while we were initializing, fulfill it now (no /devices gating).
        const pendingClip = pendingClipRef.current;
        if (pendingClip) {
          pendingClipRef.current = null;
          log('Playing pending clip after SDK ready:', pendingClip.entryId);
          void startClipPlayback(pendingClip);
        }
      });


      // Not Ready
      player.addListener('not_ready', ({ device_id }: { device_id: string }) => {
        log('Player not ready:', device_id);
        setIsReady(false);
        playbackActivatedRef.current = false;
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
      })();
    });
  }, [getAccessToken, startClipPlayback]);

  // If the Spotify access token changes, fully destroy and recreate the SDK Player.
  // (Player lifecycle must be tied to token lifecycle.)
  useEffect(() => {
    const currentToken = accessTokenRef.current;
    if (!currentToken) return;

    if (playerRef.current && playerTokenRef.current && playerTokenRef.current !== currentToken) {
      try {
        playerRef.current.disconnect();
      } catch {
        // ignore
      }

      playerRef.current = null;
      playerTokenRef.current = null;
      playbackActivatedRef.current = false;

      setIsReady(false);
      setDeviceId(null);
      deviceIdRef.current = null;
      initPromiseRef.current = null;

      // Recreate with the new token (pendingClipRef will still be honored on ready).
      setIsInitializing(true);
      initPromiseRef.current = initializePlayerCore();
    }
  }, [tokenEpoch, initializePlayerCore]);

  // Best-effort warmup after login: create the player + transfer to its device ASAP.
  // This avoids the first user click racing Spotify's device registration lifecycle.
  useEffect(() => {

    if (!authState.user) return;

    void (async () => {
      try {
        await loadSpotifySDK();
        if (playerRef.current || initPromiseRef.current) return;
        initPromiseRef.current = initializePlayerCore();
      } catch {
        // Best-effort only
      }
    })();
  }, [authState.user, loadSpotifySDK, initializePlayerCore]);

  // Ensure player creation happens inside the user gesture when possible.
  // This is the key to preventing the "first tap" being wasted on mobile.
  const startPlayerInitializationInGesture = useCallback(() => {
    if (playerRef.current || initPromiseRef.current) return;
    if (!window.Spotify?.Player) return;

    setIsInitializing(true);
    initPromiseRef.current = initializePlayerCore();
  }, [initializePlayerCore]);

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

    // Already initializing
    if (initPromiseRef.current) {
      return initPromiseRef.current;
    }

    setIsInitializing(true);

    const initPromise = (async (): Promise<boolean> => {
      try {
        await loadSpotifySDK();

        // If we got here, SDK exists; create the player.
        // (If mobile gesture already created it, initPromiseRef.current would have been set.)
        if (initPromiseRef.current) return initPromiseRef.current;

        return initializePlayerCore();
      } catch (error) {
        console.error('Error initializing Spotify player:', error);
        setIsInitializing(false);
        initPromiseRef.current = null;
        return false;
      }
    })();

    initPromiseRef.current = initPromise;
    return initPromise;
  }, [isReady, loadSpotifySDK, initializePlayerCore, startClipPlayback]);

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

    // CRITICAL: If the SDK is already loaded, create + activate the Spotify Player
    // INSIDE this same tap so mobile browsers won't immediately pause.
    startPlayerInitializationInGesture();

    // If a different clip is playing, pause it (best-effort). Also clear any existing timers.
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

    if (currentClipRef.current && currentClipRef.current.entryId !== clip.entryId && playerRef.current) {
      playerRef.current.pause().catch(() => {});
    }

    // Mark this clip as active for UI (metadata is already known)
    setCurrentClip(clip);
    requestedClipRef.current = clip;
    pendingClipRef.current = clip;
    setIsPlaying(false);
    setPosition(clip.clipStartSeconds);

    // If player is ready, activate and issue exactly one play command now.
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
  }, [isReady, unlockBrowserAudio, startPlayerInitializationInGesture, activateSpotifyPlayer, initializePlayer, startClipPlayback]);

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
      playerTokenRef.current = null;
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

    playbackActivatedRef.current = false;

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
