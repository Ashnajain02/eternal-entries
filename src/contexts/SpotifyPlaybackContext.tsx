import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';

// Debug logging
const DEBUG = true;
const log = (...args: any[]) => DEBUG && console.log('[Spotify]', ...args);

// Detect mobile/iOS
const isMobileBrowser = () => {
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
};

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

// Allowed pause reasons - for logging and debugging
type PauseReason = 'USER' | 'CLIP_END' | 'SWITCH_CLIP' | 'CLEANUP';

interface SpotifyPlaybackContextType {
  isReady: boolean;
  isInitializing: boolean;
  isPremium: boolean | null;
  isPlaying: boolean;
  isPrimed: boolean;
  currentClip: ClipPlaybackInfo | null;
  position: number;
  deviceId: string | null;
  needsReauth: boolean;
  playClip: (clip: ClipPlaybackInfo) => void;
  pauseClip: (reason: PauseReason) => Promise<void>;
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
  const { authState, authReady } = useAuth();
  
  // Core state
  const [isReady, setIsReady] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isPremium, setIsPremium] = useState<boolean | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPrimed, setIsPrimed] = useState(false);
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
  const isPrimedRef = useRef(false);
  const isPlayingRef = useRef(false); // Track if we're actively playing (not just primed)
  
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

  useEffect(() => {
    isPrimedRef.current = isPrimed;
  }, [isPrimed]);

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

  // Wait for SDK to be ready
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

  // Clear clip timers with logging
  const clearClipTimers = useCallback((reason?: string) => {
    if (clipEndTimeoutRef.current) {
      log('⏱️ Clearing clip-end timer', reason ? `(${reason})` : '');
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

  // ========== PHASE B: TRANSFER ==========
  const transferPlayback = useCallback(async (token: string, targetDeviceId: string): Promise<boolean> => {
    log('📡 TRANSFER: Sending to device', targetDeviceId);
    try {
      const response = await fetch('https://api.spotify.com/v1/me/player', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ device_ids: [targetDeviceId], play: false })
      });
      
      // 204 = success, 202 = accepted (async processing)
      // 404 = NOT treated as success (no active device - transfer may have failed)
      const success = response.status === 204 || response.status === 202;
      log('📡 TRANSFER:', response.status, success ? '✓' : '(no active playback)');
      return success || response.status === 404; // Allow 404 but log it differently
    } catch (e) {
      log('📡 TRANSFER: Failed', e);
      return false;
    }
  }, []);

  // ========== PHASE B2: KICK (mobile only) ==========
  // Wake up the SDK device before confirming
  const kickPlayer = useCallback(async (): Promise<void> => {
    const player = playerRef.current;
    if (!player) {
      log('👟 KICK: No player');
      return;
    }

    log('👟 KICK: Activating element + resume/togglePlay...');
    
    // 1. activateElement (best effort)
    try {
      await player.activateElement();
      log('👟 KICK: activateElement ✓');
    } catch {
      log('👟 KICK: activateElement (ignored)');
    }

    // 2. resume() preferred, togglePlay() fallback
    try {
      await player.resume();
      log('👟 KICK: resume() called ✓');
    } catch {
      try {
        await player.togglePlay();
        log('👟 KICK: togglePlay() called (fallback) ✓');
      } catch {
        log('👟 KICK: resume/togglePlay failed (ignored)');
      }
    }

    // 3. Fixed delay to let SDK wake up
    log('👟 KICK: Waiting 300ms...');
    await new Promise(r => setTimeout(r, 300));
    log('👟 KICK: Complete ✓');
  }, []);

  // ========== PHASE C: CONFIRM_ACTIVE (relaxed) ==========
  // Bounded polling: success if device is PRESENT (even if not active)
  // Only fail if deviceId never appears at all
  const confirmDevicePresent = useCallback(async (token: string, targetDeviceId: string): Promise<{ present: boolean; active: boolean }> => {
    log('🔍 CONFIRM: Starting bounded poll for device presence', targetDeviceId);
    const maxAttempts = 8; // 250ms * 8 = 2 seconds
    const pollInterval = 250;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await fetch('https://api.spotify.com/v1/me/player/devices', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (!response.ok) {
          log('🔍 CONFIRM: API error', response.status);
          if (attempt < maxAttempts) {
            await new Promise(r => setTimeout(r, pollInterval));
          }
          continue;
        }
        
        const data = await response.json();
        const devices = data.devices || [];
        const ourDevice = devices.find((d: any) => d.id === targetDeviceId);
        
        if (ourDevice) {
          const isActive = ourDevice.is_active === true;
          log('🔍 CONFIRM: Device PRESENT, active=' + isActive, '(attempt', attempt + ')');
          // SUCCESS: device is present (we proceed even if not active)
          return { present: true, active: isActive };
        } else {
          log('🔍 CONFIRM: Device not in list (attempt', attempt + ')');
        }
      } catch (e) {
        log('🔍 CONFIRM: Poll error', e);
      }
      
      if (attempt < maxAttempts) {
        await new Promise(r => setTimeout(r, pollInterval));
      }
    }
    
    log('🔍 CONFIRM: Device never appeared after 2s ✗');
    return { present: false, active: false };
  }, []);

  // ========== PHASE D: PLAY ONCE + CONFIRM PROGRESS ==========
  const executePlayAndConfirm = useCallback(async (clip: ClipPlaybackInfo): Promise<boolean> => {
    const token = accessTokenRef.current;
    const currentDeviceId = deviceIdRef.current;
    const player = playerRef.current;

    if (!token || !currentDeviceId) {
      log('▶️ PLAY: Missing token or deviceId');
      return false;
    }

    log('▶️ PLAY: Sending play command at position', clip.clipStartSeconds * 1000, 'ms');
    
    try {
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

      log('▶️ PLAY: Response', response.status);

      if (!response.ok) {
        if (response.status === 401) {
          setNeedsReauth(true);
        } else if (response.status === 403) {
          setIsPremium(false);
        }
        log('▶️ PLAY: Command failed ✗');
        return false;
      }

      log('▶️ PLAY: Command accepted ✓ - waiting up to 1s for playback...');

      // Wait up to 1000ms for playback to actually start
      // Check player state periodically
      const startTime = Date.now();
      const maxWait = 1000;
      const checkInterval = 100;

      while (Date.now() - startTime < maxWait) {
        await new Promise(r => setTimeout(r, checkInterval));
        
        if (!player) break;
        
        try {
          const state = await player.getCurrentState();
          if (state) {
            const isTrackMatch = state.track_window?.current_track?.uri === clip.trackUri;
            if (isTrackMatch) {
              if (!state.paused) {
                log('▶️ PLAY: Confirmed playing ✓ (paused=false)');
                return true;
              }
              if (state.position > clip.clipStartSeconds * 1000 + 50) {
                log('▶️ PLAY: Confirmed playing ✓ (position advancing)');
                return true;
              }
            }
          }
        } catch {
          // ignore getCurrentState errors
        }
      }

      log('▶️ PLAY: Playback did not start within 1s; user can tap again');
      return false;
    } catch (error) {
      console.error('▶️ PLAY: Error', error);
      return false;
    }
  }, []);

  // ========== PHASE A: PRIME (for mobile 2-tap flow) ==========
  // Uses the already-initialized player, just activates element and transfers
  const primePlayer = useCallback(async (): Promise<boolean> => {
    log('🔌 PRIME: Starting...');
    
    // Already primed and ready?
    if (isPrimedRef.current && playerRef.current && deviceIdRef.current && accessTokenRef.current) {
      log('🔌 PRIME: Already primed ✓');
      return true;
    }

    // Check if proactive init completed
    if (!playerRef.current || !deviceIdRef.current) {
      log('🔌 PRIME: Player not initialized yet - waiting...');
      
      // Wait a bit for proactive init to complete
      const maxWait = 3000;
      const startWait = Date.now();
      while (Date.now() - startWait < maxWait) {
        if (playerRef.current && deviceIdRef.current) break;
        await new Promise(r => setTimeout(r, 100));
      }
      
      if (!playerRef.current || !deviceIdRef.current) {
        log('🔌 PRIME: Player still not ready ✗');
        return false;
      }
    }

    setIsInitializing(true);

    try {
      // Get fresh token if needed
      if (!accessTokenRef.current) {
        const token = await getAccessToken();
        if (!token) {
          log('🔌 PRIME: No token ✗');
          setIsInitializing(false);
          return false;
        }
        log('🔌 PRIME: Token acquired ✓');
      }

      // Activate element (mobile gesture requirement)
      log('🔌 PRIME: Activating element...');
      try {
        await playerRef.current.activateElement();
        log('🔌 PRIME: activateElement ✓');
      } catch {
        log('🔌 PRIME: activateElement (may fail on desktop)');
      }

      log('🔌 PRIME: deviceId:', deviceIdRef.current);

      // Transfer playback to our device
      const token = accessTokenRef.current;
      const devId = deviceIdRef.current;
      if (token && devId) {
        const transferSuccess = await transferPlayback(token, devId);
        if (!transferSuccess) {
          log('🔌 PRIME: Transfer failed ✗');
          setIsInitializing(false);
          return false;
        }
      }

      // Mark as primed
      setIsPrimed(true);
      isPrimedRef.current = true;
      setIsInitializing(false);
      log('🔌 PRIME: Complete ✓');
      return true;
    } catch (error) {
      console.error('🔌 PRIME: Error', error);
      setIsInitializing(false);
      return false;
    }
  }, [getAccessToken, transferPlayback]);

  // ========== MAIN ENTRY: playClip ==========
  const playClip = useCallback((clip: ClipPlaybackInfo) => {
    log('▶️ playClip:', clip.entryId);
    const isMobile = isMobileBrowser();
    log('📱 Platform:', isMobile ? 'MOBILE' : 'DESKTOP');
    
    // Clear existing playback
    clearClipTimers('new play request');
    isPlayingRef.current = false;
    
    // Stop other clip with reason
    if (currentClipRef.current && currentClipRef.current.entryId !== clip.entryId && playerRef.current) {
      log('⏸️ SWITCH_CLIP: Pausing previous clip');
      playerRef.current.pause().catch(() => {});
    }

    // Set current clip
    setCurrentClip(clip);
    setPosition(clip.clipStartSeconds);
    setIsPlaying(false);

    // MOBILE: 2-tap strategy
    if (isMobile && !isPrimedRef.current) {
      log('📱 MOBILE: Not primed - priming only (tap again to play)');
      void primePlayer().then((primed) => {
        if (primed) {
          log('📱 MOBILE: Primed ✓ - tap play again');
        } else {
          log('📱 MOBILE: Prime failed');
        }
      });
      return;
    }

    // DESKTOP or ALREADY PRIMED: full flow
    const runFullFlow = async () => {
      setIsInitializing(true);
      const isMobileDevice = isMobileBrowser();

      // A) Prime if needed (DESKTOP only - mobile already primed)
      if (!isPrimedRef.current) {
        log('🖥️ DESKTOP: Priming...');
        const primed = await primePlayer();
        if (!primed) {
          log('🖥️ DESKTOP: Prime failed');
          setIsInitializing(false);
          return;
        }
        // primePlayer already called transferPlayback, skip to CONFIRM
      }

      const token = accessTokenRef.current;
      const devId = deviceIdRef.current;
      if (!token || !devId) {
        log('❌ Missing token or deviceId after prime');
        setIsInitializing(false);
        return;
      }

      // B) Transfer - only if ALREADY PRIMED (mobile second tap, or desktop second play)
      // Skip if we just called primePlayer() which already transferred
      if (isPrimedRef.current && !isMobileDevice) {
        // Desktop subsequent play - no need to transfer again, device should still be active
        log('📡 TRANSFER: Skipping (already primed, desktop)');
      } else if (isMobileDevice) {
        // Mobile second tap - do transfer
        log('📡 TRANSFER: Mobile second tap');
        await transferPlayback(token, devId);
        
        // B2) KICK step (mobile only) - wake up SDK device
        await kickPlayer();
      }

      // C) Confirm device is PRESENT (relaxed - not requiring is_active)
      const confirmResult = await confirmDevicePresent(token, devId);
      if (!confirmResult.present) {
        log('❌ CONFIRM: Device never appeared - user must tap again');
        setIsInitializing(false);
        return;
      }
      log('✓ CONFIRM: Device present, active=' + confirmResult.active + ' - proceeding to PLAY');

      // D) Play + confirm progress
      const started = await executePlayAndConfirm(clip);
      if (!started) {
        log('⚠️ Playback may not have started; user can tap again');
        setIsInitializing(false);
      }
      // State changes handled by player_state_changed listener
    };

    void runFullFlow();
  }, [clearClipTimers, primePlayer, transferPlayback, kickPlayer, confirmDevicePresent, executePlayAndConfirm]);

  // Pause clip - with explicit reason
  const pauseClip = useCallback(async (reason: PauseReason) => {
    log('⏸️ pauseClip reason:', reason);
    isPlayingRef.current = false;
    clearClipTimers(reason);
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
    log('🧹 Cleanup');
    isPlayingRef.current = false;
    clearClipTimers('CLEANUP');
    
    if (playerRef.current) {
      detachPlayer(playerRef.current);
      playerRef.current = null;
    }

    accessTokenRef.current = null;
    initAttemptedRef.current = false;
    isPrimedRef.current = false;

    setIsReady(false);
    setIsInitializing(false);
    setIsPlaying(false);
    setIsPrimed(false);
    setCurrentClip(null);
    setDeviceId(null);
    deviceIdRef.current = null;
  }, [clearClipTimers, detachPlayer]);

  // ========== PROACTIVE INITIALIZATION ON AUTH READY ==========
  // Initialize Spotify SDK + player when authReady becomes true
  // Cleanup when authReady becomes false (logout)
  useEffect(() => {
    // When logged out (authReady false), do nothing - don't touch SDK
    if (!authReady) {
      // If we were previously initialized, cleanup
      if (initAttemptedRef.current) {
        log('🔐 AUTH_READY false: Cleaning up Spotify...');
        cleanup();
        initAttemptedRef.current = false;
        sdkLoadedRef.current = false;
      }
      return;
    }

    // Already initializing or initialized
    if (initAttemptedRef.current) {
      log('🔄 Init already attempted, skipping');
      return;
    }

    log('🚀 AUTH_READY: Starting proactive Spotify initialization');
    initAttemptedRef.current = true;

    const initSpotify = async () => {
      // 1. Wait for SDK (loaded in index.html)
      log('🔧 INIT: Waiting for SDK...');
      await waitForSDK();
      
      if (!window.Spotify?.Player) {
        log('🔧 INIT: SDK not available after wait');
        return;
      }
      sdkLoadedRef.current = true;
      log('🔧 INIT: SDK ready ✓');

      // 2. Get token - this only happens when authenticated
      const token = await getAccessToken();
      if (!token) {
        log('🔧 INIT: No token available (user may not have Spotify connected)');
        return;
      }
      log('🔧 INIT: Token acquired ✓');

      // 3. Create player
      log('🔧 INIT: Creating player...');
      const player = new window.Spotify.Player({
        name: 'Eternal Entries Journal',
        getOAuthToken: async (callback) => {
          // Only fetch token if we're authenticated
          if (!authReady) {
            log('🔧 getOAuthToken: Not authenticated, skipping');
            return;
          }
          const t = accessTokenRef.current ?? (await getAccessToken());
          if (t) callback(t);
        },
        volume: 0.8
      });

      playerRef.current = player;

      // Set up listeners
      player.addListener('initialization_error', ({ message }) => {
        console.error('Spotify init error:', message);
      });

      player.addListener('authentication_error', ({ message }) => {
        console.error('Spotify auth error:', message);
        setNeedsReauth(true);
      });

      player.addListener('account_error', ({ message }) => {
        console.error('Spotify account error:', message);
        setIsPremium(false);
      });

      player.addListener('playback_error', ({ message }) => {
        console.error('Spotify playback error:', message);
      });

      // Simple state handler - ONLY reports state, does NOT pause
      player.addListener('player_state_changed', (state: SpotifyPlaybackState | null) => {
        if (!state) {
          log('🎧 STATE: null');
          return;
        }

        const clip = currentClipRef.current;
        if (!clip) return;

        const isTrackMatch = state.track_window?.current_track?.uri === clip.trackUri;
        if (!isTrackMatch) return;

        log('🎧 STATE:', state.paused ? 'PAUSED' : 'PLAYING', 'pos:', state.position);

        if (!state.paused) {
          // Playback started - set up timer ONCE
          if (!isPlayingRef.current) {
            log('🎵 Playback started');
            isPlayingRef.current = true;
            playbackStartTimeRef.current = performance.now();
            setIsInitializing(false);
            setIsPlaying(true);

            // Progress timer
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

            // Clip end timer - THE ONLY mechanism for clip-end pause
            const durationMs = (clip.clipEndSeconds - clip.clipStartSeconds) * 1000;
            if (clipEndTimeoutRef.current) {
              log('⏱️ Clearing old clip-end timer before scheduling new');
              window.clearTimeout(clipEndTimeoutRef.current);
            }
            log('⏱️ Scheduling clip-end timer in', durationMs, 'ms');
            clipEndTimeoutRef.current = window.setTimeout(() => {
              log('⏹️ CLIP_END: Timer fired, pausing');
              isPlayingRef.current = false;
              player.pause().catch(() => {});
              clearClipTimers('CLIP_END');
              setIsPlaying(false);
            }, durationMs);
          }
        } else {
          // Paused - ONLY update UI state
          if (isPlayingRef.current) {
            log('🎧 STATE: External pause detected (was playing)');
            isPlayingRef.current = false;
            clearClipTimers('external pause');
            setIsPlaying(false);
            setIsInitializing(false);
          }
        }
      });

      player.addListener('ready', ({ device_id }: { device_id: string }) => {
        log('🔧 INIT: Player ready, deviceId:', device_id);
        deviceIdRef.current = device_id;
        setDeviceId(device_id);
        setIsReady(true);
      });

      player.addListener('not_ready', ({ device_id }: { device_id: string }) => {
        log('🔧 INIT: Player not ready:', device_id);
        setIsReady(false);
      });

      // 4. Connect
      log('🔧 INIT: Connecting...');
      const connected = await player.connect();
      if (!connected) {
        log('🔧 INIT: Connect failed');
        return;
      }
      log('🔧 INIT: Connected ✓');

      // Wait for deviceId
      const waitForDevice = new Promise<boolean>((resolve) => {
        const checkDevice = () => {
          if (deviceIdRef.current) {
            resolve(true);
          } else {
            setTimeout(checkDevice, 100);
          }
        };
        checkDevice();
        setTimeout(() => resolve(!!deviceIdRef.current), 5000);
      });

      const gotDevice = await waitForDevice;
      if (gotDevice) {
        log('🔧 INIT: Proactive initialization complete ✓ deviceId:', deviceIdRef.current);
      } else {
        log('🔧 INIT: No deviceId after connect');
      }
    };

    initSpotify().catch((err) => {
      console.error('🔧 INIT: Error during proactive init', err);
    });
  }, [authReady, waitForSDK, getAccessToken, clearClipTimers, cleanup]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  const value: SpotifyPlaybackContextType = {
    isReady,
    isInitializing,
    isPremium,
    isPlaying,
    isPrimed,
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
