import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';

// Debug logging - ENABLED to diagnose mobile playback issues
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
  const [spotifyConnected, setSpotifyConnected] = useState(false);
  
  const playerRef = useRef<SpotifyPlayerInstance | null>(null);
  const accessTokenRef = useRef<string | null>(null);
  const playerTokenRef = useRef<string | null>(null);
  const sdkLoadedRef = useRef(false);
  const pendingClipRef = useRef<ClipPlaybackInfo | null>(null);
  const currentClipRef = useRef<ClipPlaybackInfo | null>(null);
  const deviceIdRef = useRef<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const initPromiseRef = useRef<Promise<boolean> | null>(null);
  const earlyInitAttemptedRef = useRef(false);

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

  // Auto-pause recovery: track last confirmed playing state for retry logic
  const lastPlayingStateRef = useRef<{ position: number; timestamp: number } | null>(null);
  const autoPauseRetryUsedRef = useRef(false); // Max 1 retry per gesture/command
  const currentCommandIdRef = useRef<string | null>(null);

  // Proactive init run tracking (should run exactly once per session, once Spotify connected)
  const proactiveInitRunCountRef = useRef(0);

  // Stabilization logic: only mark playback started once it's stable
  const stablePlaybackTimeoutRef = useRef<number | null>(null);
  const pendingStabilityRef = useRef<
    | {
        commandId: string;
        clip: ClipPlaybackInfo;
        firstUnpausedPerfMs: number;
        firstUnpausedPositionMs: number;
      }
    | null
  >(null);
  const stabilizationRetryRef = useRef<
    | {
        commandId: string;
        attempts: number; // retries used (max 3)
        timeoutId: number | null;
      }
    | null
  >(null);

  // Device activation handshake caching
  const deviceActivationCacheRef = useRef<
    | {
        deviceId: string;
        activeUntilPerfMs: number;
      }
    | null
  >(null);

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
        const nextToken: string = data.access_token;
        const prevToken: string | null = accessTokenRef.current;

        accessTokenRef.current = nextToken;
        // Premium status is stored at connection time, use from response
        setIsPremium(data.is_premium ?? false);
        
        // Mark Spotify as connected when we get a valid token
        if (!spotifyConnected) {
          setSpotifyConnected(true);
        }

        // Track token changes so we can rebuild the SDK Player if needed
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
  }, [spotifyConnected]);


  // Load Spotify SDK script - uses the callback defined in index.html
  // SINGLE LOADER PATH: The script is already in index.html, we just wait for ready
  const loadSpotifySDK = useCallback((): Promise<void> => {
    return new Promise((resolve) => {
      // Already loaded and ready
      if (sdkLoadedRef.current && window.Spotify) {
        resolve();
        return;
      }

      // SDK already ready (callback fired before we mounted)
      if (window.__spotifySDKReady && window.Spotify) {
        log('SDK was already ready before mount');
        sdkLoadedRef.current = true;
        resolve();
        return;
      }

      // Script exists but SDK not ready yet - wait for callback
      if (document.getElementById('spotify-player-sdk')) {
        if (window.Spotify) {
          sdkLoadedRef.current = true;
          resolve();
        } else {
          // Register to be notified when SDK is ready
          if (!window.__spotifySDKReadyPromiseResolvers) {
            window.__spotifySDKReadyPromiseResolvers = [];
          }
          window.__spotifySDKReadyPromiseResolvers.push(() => {
            sdkLoadedRef.current = true;
            resolve();
          });
        }
        return;
      }

      // Fallback: script not in DOM (shouldn't happen, but safety)
      log('SDK script not found - injecting dynamically');
      
      if (!window.__spotifySDKReadyPromiseResolvers) {
        window.__spotifySDKReadyPromiseResolvers = [];
      }
      window.__spotifySDKReadyPromiseResolvers.push(() => {
        sdkLoadedRef.current = true;
        resolve();
      });

      const script = document.createElement('script');
      script.id = 'spotify-player-sdk';
      script.src = 'https://sdk.scdn.co/spotify-player.js';
      script.async = true;
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

  const STABLE_UNPAUSED_MS = 500;
  const STABLE_POSITION_ADVANCE_MS = 250;
  const AUTO_PAUSE_WINDOW_MS = 700;
  const STABILIZATION_RETRY_BACKOFF_MS = [150, 300, 600];
  const DEVICE_HANDSHAKE_TIMEOUT_MS = 3000;
  const DEVICE_HANDSHAKE_POLL_MS = 250;
  const DEVICE_ACTIVE_CACHE_MS = 8000;

  const clearStabilization = useCallback(() => {
    if (stablePlaybackTimeoutRef.current) {
      window.clearTimeout(stablePlaybackTimeoutRef.current);
      stablePlaybackTimeoutRef.current = null;
    }
    if (stabilizationRetryRef.current?.timeoutId) {
      window.clearTimeout(stabilizationRetryRef.current.timeoutId);
    }
    stabilizationRetryRef.current = null;
    pendingStabilityRef.current = null;
  }, []);

  const detachPlayer = useCallback((player: SpotifyPlayerInstance | null, reason: string) => {
    if (!player) return;
    try {
      // Best-effort: remove all listeners for known events (prevents duplicates)
      player.removeListener('initialization_error');
      player.removeListener('authentication_error');
      player.removeListener('account_error');
      player.removeListener('playback_error');
      player.removeListener('player_state_changed');
      player.removeListener('ready');
      player.removeListener('not_ready');
    } catch {
      // ignore
    }
    try {
      player.disconnect();
      log('Detached Spotify player:', reason);
    } catch {
      // ignore
    }
  }, []);

  const fetchDevices = useCallback(async (token: string): Promise<any | null> => {
    try {
      const resp = await fetch('https://api.spotify.com/v1/me/player/devices', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!resp.ok) return null;
      return resp.json();
    } catch {
      return null;
    }
  }, []);

  const ensureDeviceActive = useCallback(
    async (token: string, sdkDeviceId: string): Promise<boolean> => {
      const cached = deviceActivationCacheRef.current;
      const nowPerf = performance.now();
      if (cached && cached.deviceId === sdkDeviceId && nowPerf < cached.activeUntilPerfMs) {
        log('Device handshake: using cached active device', { sdkDeviceId });
        return true;
      }

      const deadline = nowPerf + DEVICE_HANDSHAKE_TIMEOUT_MS;
      let lastPresent = false;
      let lastActive = false;
      let transferAttempted = false;

      while (performance.now() < deadline) {
        const data = await fetchDevices(token);
        const devices: Array<any> = data?.devices ?? [];
        const sdkDevice = devices.find((d) => d?.id === sdkDeviceId);

        if (!sdkDevice) {
          lastPresent = false;
          await new Promise((r) => window.setTimeout(r, DEVICE_HANDSHAKE_POLL_MS));
          continue;
        }

        lastPresent = true;
        lastActive = !!sdkDevice.is_active;
        if (sdkDevice.is_active) break;

        // Transfer playback to this device (no autoplay)
        if (!transferAttempted) {
          transferAttempted = true;
          log('Device handshake: SDK device present but inactive; transferring (play:false)', { sdkDeviceId });
          try {
            await fetch('https://api.spotify.com/v1/me/player', {
              method: 'PUT',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ device_ids: [sdkDeviceId], play: false })
            });
          } catch {
            // ignore
          }
        }

        await new Promise((r) => window.setTimeout(r, DEVICE_HANDSHAKE_POLL_MS));
      }

      log('Device handshake result:', {
        sdkDeviceId,
        present: lastPresent,
        active: lastActive,
        timeoutMs: DEVICE_HANDSHAKE_TIMEOUT_MS
      });

      if (lastPresent && lastActive) {
        deviceActivationCacheRef.current = {
          deviceId: sdkDeviceId,
          activeUntilPerfMs: performance.now() + DEVICE_ACTIVE_CACHE_MS
        };
        return true;
      }

      return false;
    },
    [fetchDevices]
  );

  // NOTE (device registration race):
  // We intentionally do NOT gate first playback on /v1/me/player/devices or is_active.
  // Some Spotify accounts/environments only surface the SDK device to /devices AFTER the first
  // successful /play. Gating on /devices would deadlock first playback.

  // Start playback of a specific clip.
  // IMPORTANT: This does NOT schedule clip-end or progress yet.
  // Those start ONLY when we observe playback actually begin (player_state_changed: paused=false).
  const startClipPlayback = useCallback(async (
    clip: ClipPlaybackInfo,
    opts?: { skipReset?: boolean; reason?: string; commandId?: string }
  ): Promise<boolean> => {
    log('🚀 startClipPlayback called:', clip.entryId);
    
    const token = await getAccessToken();
    const currentDeviceId = deviceIdRef.current;

    log('startClipPlayback prerequisites:', {
      hasToken: !!token,
      deviceId: currentDeviceId,
      hasPlayer: !!playerRef.current
    });

    if (!token || !currentDeviceId || !playerRef.current) {
      log('Cannot start playback - missing token/device/player', {
        token: !!token,
        deviceId: currentDeviceId,
        player: !!playerRef.current
      });
      return false;
    }

    try {
      log('Starting playback for clip:', clip.entryId, {
        reason: opts?.reason,
        skipReset: !!opts?.skipReset,
        commandId: opts?.commandId ?? currentCommandIdRef.current
      });

      if (!opts?.skipReset) {
        // Single owner reset
        clearClipTimers();
        clearStabilization();
        requestedClipRef.current = clip;
        playbackStartedRef.current = false;
        setIsPlaying(false);
        setPosition(clip.clipStartSeconds);
        setIsInitializing(true);
      }

      // Set volume (best-effort)
      playerRef.current.setVolume(0.8).catch(() => {});

      const sleep = (ms: number) => new Promise((r) => window.setTimeout(r, ms));

      const sendPlay = async (): Promise<Response> => {
        const playUrl = `https://api.spotify.com/v1/me/player/play?device_id=${currentDeviceId}`;
        const playBody = {
          uris: [clip.trackUri],
          position_ms: Math.max(0, Math.floor(clip.clipStartSeconds * 1000))
        };
        log('Sending play request:', { url: playUrl, body: playBody });
        
        return fetch(playUrl, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(playBody)
        });
      };

      // Strict device activation handshake (cached) before play
      const active = await ensureDeviceActive(token, currentDeviceId);
      if (!active) {
        log('Device handshake did not confirm active device within timeout; proceeding with /play anyway');
      }

      // First-play must be allowed immediately after SDK ready.
      // If Spotify returns 404 (Device not found) on the very first attempt, retry ONCE shortly.
      let response = await sendPlay();
      log('First play response:', response.status, response.statusText);

      if (!response.ok && response.status === 404 && !playbackActivatedRef.current) {
        log('Got 404 on first play - retrying after 400ms...');
        await response.json().catch(() => ({})); // drain body (best-effort)
        await sleep(400);
        response = await sendPlay();
        log('Retry play response:', response.status, response.statusText);
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[Spotify] Failed to start playback:', response.status, errorData);

        setIsInitializing(false);

        if (response.status === 401) {
          log('401 - needs reauth');
          setNeedsReauth(true);
        } else if (response.status === 403) {
          log('403 - not premium');
          setIsPremium(false);
        }
        return false;
      }

      // Mark activation after the first successful /play.
      playbackActivatedRef.current = true;

      // We intentionally do NOT set isPlaying=true here.
      // We wait for the SDK state event that confirms playback has actually begun.
      log('✅ Play command accepted (HTTP 2xx); awaiting player_state_changed event');
      return true;
    } catch (error) {
      console.error('[Spotify] Error starting playback:', error);
      if (!opts?.skipReset) setIsInitializing(false);
      return false;
    }
  }, [clearClipTimers, clearStabilization, ensureDeviceActive, getAccessToken]);



  // Core player initialization that does NOT await anything before creating the Player.
  // This allows us to create + activate the Spotify element inside the user's tap (mobile requirement).
  const initializePlayerCore = useCallback((): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      void (async () => {
        // Prevent duplicate listener attachment: always detach any existing player first
        if (playerRef.current) {
          detachPlayer(playerRef.current, 'initializePlayerCore:recreate');
          playerRef.current = null;
          playerTokenRef.current = null;
          setIsReady(false);
          setDeviceId(null);
          deviceIdRef.current = null;
        }

        if (!window.Spotify?.Player) {
          log('Spotify SDK not available yet');
          setIsInitializing(false);
          initPromiseRef.current = null;
          resolve(false);
          return;
        }

        // REQUIRED: never construct Spotify.Player until we have a valid access token.
        // Do not use any cached token here—constructing the SDK device with a stale token
        // can permanently wedge the device until refresh.
        const tokenForPlayer = await getAccessToken();
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
        log('✅ activateElement succeeded on player');
      } catch (e) {
        log('❌ activateElement failed:', e);
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
        log('player_state_changed event received:', state ? {
          paused: state.paused,
          position: state.position,
          track: state.track_window?.current_track?.name
        } : 'null state');

        if (!state) {
          // No state usually means not playing on this device.
          log('No state - setting isPlaying=false, isInitializing=false');
          setIsPlaying(false);
          setIsInitializing(false);
          return;
        }

        const clip = requestedClipRef.current;
        if (!clip) {
          log('No requestedClip ref - ignoring state change');
          return;
        }

        const isTrackMatch = state.track_window?.current_track?.uri === clip.trackUri;
        log('Track match check:', { 
          currentUri: state.track_window?.current_track?.uri, 
          requestedUri: clip.trackUri, 
          matches: isTrackMatch 
        });
        if (!isTrackMatch) return;

        const commandId = currentCommandIdRef.current ?? 'no-command';

        const markStablePlayback = (reason: string) => {
          if (playbackStartedRef.current) return;

          // Stable playback achieved
          log('✅ Stable playback achieved:', {
            reason,
            commandId,
            position: state.position
          });

          // Clear stabilization timers/retries
          if (stablePlaybackTimeoutRef.current) {
            window.clearTimeout(stablePlaybackTimeoutRef.current);
            stablePlaybackTimeoutRef.current = null;
          }
          if (stabilizationRetryRef.current?.timeoutId) {
            window.clearTimeout(stabilizationRetryRef.current.timeoutId);
          }
          stabilizationRetryRef.current = null;
          pendingStabilityRef.current = null;

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
          log('Scheduling clip-end timeout for', durationMs, 'ms');
          clipEndTimeoutRef.current = window.setTimeout(() => {
            log('Clip-end timeout fired - pausing');
            player.pause().catch(() => {});
            clearClipTimers();
            pendingStabilityRef.current = null;
            setIsPlaying(false);
          }, durationMs);
        };

        // Unpaused state: start/continue stabilization, but do not mark as playing yet
        if (!state.paused && !playbackStartedRef.current) {
          const pending = pendingStabilityRef.current;
          if (!pending || pending.commandId !== commandId) {
            pendingStabilityRef.current = {
              commandId,
              clip,
              firstUnpausedPerfMs: performance.now(),
              firstUnpausedPositionMs: state.position
            };

            log('⏳ Unpaused observed; waiting for stable playback...', {
              commandId,
              position: state.position,
              stableMs: STABLE_UNPAUSED_MS,
              stableAdvanceMs: STABLE_POSITION_ADVANCE_MS
            });

            if (stablePlaybackTimeoutRef.current) {
              window.clearTimeout(stablePlaybackTimeoutRef.current);
            }
            stablePlaybackTimeoutRef.current = window.setTimeout(() => {
              // If we still haven't become stable and no pause happened, accept stability by time
              const stillPending = pendingStabilityRef.current;
              if (stillPending && stillPending.commandId === commandId) {
                markStablePlayback('unpaused_for_500ms');
              }
            }, STABLE_UNPAUSED_MS);
          } else {
            // If we observe position advance, mark stable earlier
            const advancedBy = state.position - pending.firstUnpausedPositionMs;
            if (advancedBy >= STABLE_POSITION_ADVANCE_MS) {
              markStablePlayback('position_advanced');
            }
          }
          return;
        }

        // Paused state handling
        if (state.paused) {
          // If we were already stable, accept the pause normally
          if (playbackStartedRef.current) {
            log('⏸️ Playback paused after stable start - clearing timers');
            clearClipTimers();
            pendingStabilityRef.current = null;
            setIsPlaying(false);
            setIsInitializing(false);
            return;
          }

          // Detect auto-pause bug during stabilization window
          const pending = pendingStabilityRef.current;
          if (pending && pending.commandId === commandId) {
            const elapsed = performance.now() - pending.firstUnpausedPerfMs;
            const posDelta = Math.abs(state.position - pending.firstUnpausedPositionMs);
            const positionUnchanged = posDelta < STABLE_POSITION_ADVANCE_MS;

            if (elapsed < AUTO_PAUSE_WINDOW_MS && positionUnchanged) {
              // Bounded stabilization retries
              const current = stabilizationRetryRef.current;
              const retries = current && current.commandId === commandId ? current.attempts : 0;
              const nextAttempt = retries + 1;

              if (nextAttempt <= STABILIZATION_RETRY_BACKOFF_MS.length) {
                const delay = STABILIZATION_RETRY_BACKOFF_MS[nextAttempt - 1];
                log('🔄 Auto-pause detected; scheduling stabilization retry', {
                  commandId,
                  attempt: nextAttempt,
                  delayMs: delay,
                  elapsedMs: Math.round(elapsed),
                  position: state.position
                });

                // Cancel stability timer and reschedule retry
                if (stablePlaybackTimeoutRef.current) {
                  window.clearTimeout(stablePlaybackTimeoutRef.current);
                  stablePlaybackTimeoutRef.current = null;
                }

                if (current?.timeoutId) window.clearTimeout(current.timeoutId);
                stabilizationRetryRef.current = { commandId, attempts: nextAttempt, timeoutId: null };
                stabilizationRetryRef.current.timeoutId = window.setTimeout(() => {
                  // Only retry if this is still the active command
                  if ((currentCommandIdRef.current ?? '') !== commandId) return;
                  // Reset pending stability so we can require stability again
                  pendingStabilityRef.current = null;
                  void startClipPlayback(clip, {
                    skipReset: true,
                    reason: `stabilization_retry_${nextAttempt}`,
                    commandId
                  });
                }, delay);

                // Keep isInitializing=true during stabilization attempts
                setIsInitializing(true);
                return;
              }
            }
          }

          // Not recoverable (or retries exhausted) -> stop loading and accept pause
          log('⏸️ Paused during stabilization; retries exhausted or conditions not met', {
            commandId,
            attempts: stabilizationRetryRef.current?.commandId === commandId ? stabilizationRetryRef.current.attempts : 0
          });
          clearStabilization();
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
        log('Calling player.connect()...');
        player.connect().then((connected) => {
          log('player.connect() resolved:', connected);
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
      detachPlayer(playerRef.current, 'token_change');

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
  }, [tokenEpoch, initializePlayerCore, detachPlayer]);

  // EARLY PLAYER INITIALIZATION: Create player as soon as auth + Spotify connected
  // This ensures the player exists BEFORE the user taps play, avoiding first-tap issues
  useEffect(() => {
    if (!authState.user) return;
    if (!spotifyConnected) return;
    if (earlyInitAttemptedRef.current) return;
    if (playerRef.current || initPromiseRef.current) return;

    // HARD GATE: proactive init can only run once per session
    earlyInitAttemptedRef.current = true;
    proactiveInitRunCountRef.current += 1;
    log('Proactive init run count:', proactiveInitRunCountRef.current);

    void (async () => {
      try {
        await loadSpotifySDK();
        if (playerRef.current || initPromiseRef.current) return;
        log('Early init: Spotify connected, creating player (NO auto-play)');
        initPromiseRef.current = initializePlayerCore();
      } catch (e) {
        log('Early init failed (best-effort):', e);
      }
    })();
  }, [authState.user, spotifyConnected, loadSpotifySDK, initializePlayerCore]);

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
    log('unlockBrowserAudio called, already unlocked:', audioUnlockedRef.current);
    
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
        console.error('[Spotify] Failed to create AudioContext:', e);
      }
    }

    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      log('AudioContext is suspended, resuming...');
      // This MUST be called synchronously in the gesture handler
      audioContextRef.current.resume().then(() => {
        log('AudioContext resumed successfully, new state:', audioContextRef.current?.state);
      }).catch((e) => {
        console.error('[Spotify] Failed to resume AudioContext:', e);
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
        console.error('[Spotify] Silent buffer error:', e);
      }
    }

    // If Spotify player already exists, activate its element too
    if (playerRef.current) {
      try {
        playerRef.current.activateElement();
        log('Activated existing Spotify player element');
      } catch (e) {
        log('activateElement failed (may not exist on platform):', e);
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
    // Generate a unique command ID for this play gesture (used for retry gating)
    const commandId = `${clip.entryId}-${Date.now()}`;
    currentCommandIdRef.current = commandId;
    autoPauseRetryUsedRef.current = false; // Reset retry flag for new command
    lastPlayingStateRef.current = null;
    clearStabilization();
    stabilizationRetryRef.current = { commandId, attempts: 0, timeoutId: null };
    
    log('▶️ playClip called:', clip.entryId, {
      trackUri: clip.trackUri,
      clipStart: clip.clipStartSeconds,
      clipEnd: clip.clipEndSeconds,
      commandId
    });
    log('Current state:', {
      isReady,
      hasPlayer: !!playerRef.current,
      hasToken: !!accessTokenRef.current,
      deviceId: deviceIdRef.current,
      audioUnlocked: audioUnlockedRef.current
    });

    // STEP 1: SYNCHRONOUS - Activate Spotify player element IMMEDIATELY if it exists
    // This preserves the user gesture chain for mobile browsers
    if (playerRef.current) {
      try {
        playerRef.current.activateElement();
        log('✅ activateElement called (player exists)');
      } catch (e) {
        log('❌ activateElement failed:', e);
      }
    }

    // STEP 2: SYNCHRONOUS - Unlock browser audio (AudioContext + silent buffer)
    unlockBrowserAudio();

    // STEP 3: SYNCHRONOUS - If SDK loaded but player doesn't exist, create it NOW
    log('Calling startPlayerInitializationInGesture...');
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
      log('Pausing previous clip:', currentClipRef.current.entryId);
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
      log('Player ready - starting playback immediately');
      pendingClipRef.current = null;
      activateSpotifyPlayer();
      void startClipPlayback(clip, { commandId, reason: 'play_immediate' });
      return;
    }

    // Otherwise, initialize; when ready, it will start the pending clip once.
    log('Player not ready - initializing...');
    void initializePlayer().then((success) => {
      log('initializePlayer resolved:', success);
      if (!success && pendingClipRef.current?.entryId === clip.entryId) {
        log('Initialization failed - clearing pending clip');
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
    clearStabilization();
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
      detachPlayer(playerRef.current, 'cleanup');
      playerRef.current = null;
      playerTokenRef.current = null;
    }

    // Critical: clear cached token so a new login cannot accidentally build a Player with a stale token.
    accessTokenRef.current = null;

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

    // Reset one-time init gates for next session
    earlyInitAttemptedRef.current = false;
    proactiveInitRunCountRef.current = 0;
    deviceActivationCacheRef.current = null;
    stabilizationRetryRef.current = null;
    pendingStabilityRef.current = null;

    playbackActivatedRef.current = false;

  }, [clearStabilization, detachPlayer]);

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
