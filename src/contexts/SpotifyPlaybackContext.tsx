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
      
      const success = response.status === 204 || response.status === 404 || response.status === 202;
      log('📡 TRANSFER:', response.status, success ? '✓' : '✗');
      return success;
    } catch (e) {
      log('📡 TRANSFER: Failed', e);
      return false;
    }
  }, []);

  // ========== PHASE C: CONFIRM_ACTIVE ==========
  // Bounded polling: every 250ms for up to 2 seconds
  const confirmDeviceActive = useCallback(async (token: string, targetDeviceId: string): Promise<boolean> => {
    log('🔍 CONFIRM_ACTIVE: Starting bounded poll for device', targetDeviceId);
    const maxAttempts = 8; // 250ms * 8 = 2 seconds
    const pollInterval = 250;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await fetch('https://api.spotify.com/v1/me/player/devices', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (!response.ok) {
          log('🔍 CONFIRM_ACTIVE: API error', response.status);
          continue;
        }
        
        const data = await response.json();
        const devices = data.devices || [];
        const ourDevice = devices.find((d: any) => d.id === targetDeviceId);
        
        if (ourDevice) {
          if (ourDevice.is_active) {
            log('🔍 CONFIRM_ACTIVE: Device active ✓ (attempt', attempt + ')');
            return true;
          } else {
            log('🔍 CONFIRM_ACTIVE: Device found but not active (attempt', attempt + ')');
          }
        } else {
          log('🔍 CONFIRM_ACTIVE: Device not in list (attempt', attempt + ')');
        }
      } catch (e) {
        log('🔍 CONFIRM_ACTIVE: Poll error', e);
      }
      
      if (attempt < maxAttempts) {
        await new Promise(r => setTimeout(r, pollInterval));
      }
    }
    
    log('🔍 CONFIRM_ACTIVE: Timeout - device not active after 2s');
    return false;
  }, []);

  // ========== PHASE D: PLAY ONCE ==========
  const executePlay = useCallback(async (clip: ClipPlaybackInfo): Promise<boolean> => {
    const token = accessTokenRef.current;
    const currentDeviceId = deviceIdRef.current;

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
        return false;
      }

      log('▶️ PLAY: Command accepted ✓');
      return true;
    } catch (error) {
      console.error('▶️ PLAY: Error', error);
      return false;
    }
  }, []);

  // ========== PHASE A: PRIME ==========
  // Creates and connects player, but does NOT play
  const primePlayer = useCallback(async (): Promise<boolean> => {
    log('🔌 PRIME: Starting...');
    
    // Already primed and ready?
    if (isPrimedRef.current && playerRef.current && deviceIdRef.current && accessTokenRef.current) {
      log('🔌 PRIME: Already primed ✓');
      return true;
    }

    setIsInitializing(true);

    try {
      // 1. Wait for SDK
      log('🔌 PRIME: Waiting for SDK...');
      await waitForSDK();

      if (!window.Spotify?.Player) {
        log('🔌 PRIME: SDK not available ✗');
        setIsInitializing(false);
        return false;
      }
      log('🔌 PRIME: SDK loaded ✓');

      // 2. Get token
      const token = await getAccessToken();
      if (!token) {
        log('🔌 PRIME: No token ✗');
        setIsInitializing(false);
        return false;
      }
      log('🔌 PRIME: Token acquired ✓');

      // 3. Create player if needed
      if (!playerRef.current) {
        log('🔌 PRIME: Creating player...');
        
        const player = new window.Spotify.Player({
          name: 'Eternal Entries Journal',
          getOAuthToken: async (callback) => {
            const t = accessTokenRef.current ?? (await getAccessToken());
            if (t) callback(t);
          },
          volume: 0.8
        });

        playerRef.current = player;

        // Set up listeners ONCE
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

        // Simple state handler - no retries
        player.addListener('player_state_changed', (state: SpotifyPlaybackState | null) => {
          if (!state) {
            log('🎧 STATE: null');
            setIsPlaying(false);
            return;
          }

          const clip = currentClipRef.current;
          if (!clip) return;

          const isTrackMatch = state.track_window?.current_track?.uri === clip.trackUri;
          if (!isTrackMatch) return;

          log('🎧 STATE:', state.paused ? 'PAUSED' : 'PLAYING', 'pos:', state.position);

          if (!state.paused) {
            // Playback started
            if (!playbackStartTimeRef.current) {
              log('🎵 Playback started');
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

              // Clip end timer
              const durationMs = (clip.clipEndSeconds - clip.clipStartSeconds) * 1000;
              log('⏱️ Clip end scheduled in', durationMs, 'ms');
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
            // Paused - just report it, no retries
            log('⏸️ Paused');
            clearClipTimers();
            setIsPlaying(false);
            setIsInitializing(false);
          }
        });

        player.addListener('ready', ({ device_id }: { device_id: string }) => {
          log('🔌 PRIME: Player ready, deviceId:', device_id);
          deviceIdRef.current = device_id;
          setDeviceId(device_id);
          setIsReady(true);
        });

        player.addListener('not_ready', ({ device_id }: { device_id: string }) => {
          log('🔌 PRIME: Player not ready:', device_id);
          setIsReady(false);
        });

        // 4. Activate element (mobile gesture requirement)
        try {
          await player.activateElement();
          log('🔌 PRIME: activateElement ✓');
        } catch {
          log('🔌 PRIME: activateElement (may fail on desktop)');
        }

        // 5. Connect and wait for ready
        log('🔌 PRIME: Connecting...');
        const connected = await player.connect();
        if (!connected) {
          log('🔌 PRIME: Connect failed ✗');
          setIsInitializing(false);
          return false;
        }
        log('🔌 PRIME: Connected ✓');

        // Wait for deviceId (ready event)
        const waitForDevice = new Promise<boolean>((resolve) => {
          const checkDevice = () => {
            if (deviceIdRef.current) {
              resolve(true);
            } else {
              setTimeout(checkDevice, 100);
            }
          };
          checkDevice();
          // Timeout after 5 seconds
          setTimeout(() => resolve(!!deviceIdRef.current), 5000);
        });

        const gotDevice = await waitForDevice;
        if (!gotDevice) {
          log('🔌 PRIME: No deviceId after connect ✗');
          setIsInitializing(false);
          return false;
        }
      } else {
        // Player exists - ensure it's connected
        log('🔌 PRIME: Player exists, activating element...');
        try {
          await playerRef.current.activateElement();
          log('🔌 PRIME: activateElement ✓');
        } catch {
          log('🔌 PRIME: activateElement (may fail)');
        }
      }

      log('🔌 PRIME: deviceId:', deviceIdRef.current);

      // 6. Transfer playback to our device
      const token2 = accessTokenRef.current;
      const devId = deviceIdRef.current;
      if (token2 && devId) {
        await transferPlayback(token2, devId);
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
  }, [waitForSDK, getAccessToken, transferPlayback, clearClipTimers]);

  // ========== MAIN ENTRY: playClip ==========
  const playClip = useCallback((clip: ClipPlaybackInfo) => {
    log('▶️ playClip:', clip.entryId);
    const isMobile = isMobileBrowser();
    log('📱 Platform:', isMobile ? 'MOBILE' : 'DESKTOP');
    
    // Clear existing playback
    clearClipTimers();
    
    // Stop other clip
    if (currentClipRef.current && currentClipRef.current.entryId !== clip.entryId && playerRef.current) {
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

      // A) Prime if needed
      if (!isPrimedRef.current) {
        log('🖥️ DESKTOP: Priming...');
        const primed = await primePlayer();
        if (!primed) {
          log('🖥️ DESKTOP: Prime failed');
          setIsInitializing(false);
          return;
        }
      }

      const token = accessTokenRef.current;
      const devId = deviceIdRef.current;
      if (!token || !devId) {
        log('❌ Missing token or deviceId after prime');
        setIsInitializing(false);
        return;
      }

      // B) Transfer (already done in prime, but ensure it's fresh)
      await transferPlayback(token, devId);

      // C) Confirm device is active (bounded polling)
      const isActive = await confirmDeviceActive(token, devId);
      if (!isActive) {
        log('❌ CONFIRM_ACTIVE failed - device not active');
        log('📱 User must tap play again');
        setIsInitializing(false);
        // Stay primed so next tap can try play directly
        return;
      }

      // D) Play
      const played = await executePlay(clip);
      if (!played) {
        log('❌ PLAY command failed');
        setIsInitializing(false);
      }
      // State changes handled by player_state_changed listener
    };

    void runFullFlow();
  }, [clearClipTimers, primePlayer, transferPlayback, confirmDeviceActive, executePlay]);

  // Pause clip
  const pauseClip = useCallback(async () => {
    log('⏸️ pauseClip');
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
    log('🧹 Cleanup');
    clearClipTimers();
    
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
