import { useState, useRef, useCallback, useEffect } from 'react';

interface WeatherAnimationState {
  isPlaying: boolean;
  isVisible: boolean;
  phase: 'idle' | 'fading-in' | 'playing' | 'fading-out';
}

// Global state to track which entry is currently playing
let currentPlayingEntryId: string | null = null;
let stopCurrentAnimation: (() => void) | null = null;

const FADE_DURATION = 500; // ms
const ANIMATION_DURATION = 8000; // ms - how long weather plays

export function useWeatherAnimation(entryId: string) {
  const [state, setState] = useState<WeatherAnimationState>({
    isPlaying: false,
    isVisible: false,
    phase: 'idle',
  });
  
  const timeoutRefs = useRef<NodeJS.Timeout[]>([]);
  const isActiveRef = useRef(false);
  
  // Cleanup all timeouts
  const clearAllTimeouts = useCallback(() => {
    timeoutRefs.current.forEach(clearTimeout);
    timeoutRefs.current = [];
  }, []);
  
  // Stop animation immediately
  const stopAnimation = useCallback(() => {
    clearAllTimeouts();
    isActiveRef.current = false;
    setState({
      isPlaying: false,
      isVisible: false,
      phase: 'idle',
    });
    
    if (currentPlayingEntryId === entryId) {
      currentPlayingEntryId = null;
      stopCurrentAnimation = null;
    }
  }, [entryId, clearAllTimeouts]);
  
  // Play the animation once
  const playAnimation = useCallback(() => {
    // If another entry is playing, stop it first
    if (currentPlayingEntryId && currentPlayingEntryId !== entryId && stopCurrentAnimation) {
      stopCurrentAnimation();
    }
    
    // Reset and start fresh
    clearAllTimeouts();
    isActiveRef.current = true;
    currentPlayingEntryId = entryId;
    stopCurrentAnimation = stopAnimation;
    
    // Phase 1: Fade in
    setState({
      isPlaying: true,
      isVisible: true,
      phase: 'fading-in',
    });
    
    // Phase 2: Playing (after fade in completes)
    const playTimeout = setTimeout(() => {
      if (!isActiveRef.current) return;
      setState(prev => ({ ...prev, phase: 'playing' }));
    }, FADE_DURATION);
    timeoutRefs.current.push(playTimeout);
    
    // Phase 3: Fade out (after animation duration)
    const fadeOutTimeout = setTimeout(() => {
      if (!isActiveRef.current) return;
      setState(prev => ({ ...prev, phase: 'fading-out' }));
    }, FADE_DURATION + ANIMATION_DURATION);
    timeoutRefs.current.push(fadeOutTimeout);
    
    // Phase 4: Complete (after fade out)
    const completeTimeout = setTimeout(() => {
      if (!isActiveRef.current) return;
      setState({
        isPlaying: false,
        isVisible: false,
        phase: 'idle',
      });
      currentPlayingEntryId = null;
      stopCurrentAnimation = null;
    }, FADE_DURATION + ANIMATION_DURATION + FADE_DURATION);
    timeoutRefs.current.push(completeTimeout);
  }, [entryId, clearAllTimeouts, stopAnimation]);
  
  // Handle visibility change (pause when tab is hidden)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && state.isPlaying) {
        // Pause - we'll just stop the animation for simplicity
        stopAnimation();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [state.isPlaying, stopAnimation]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearAllTimeouts();
      if (currentPlayingEntryId === entryId) {
        currentPlayingEntryId = null;
        stopCurrentAnimation = null;
      }
    };
  }, [entryId, clearAllTimeouts]);
  
  return {
    ...state,
    playAnimation,
    stopAnimation,
    opacity: state.phase === 'fading-in' ? 0 : state.phase === 'fading-out' ? 0 : state.isVisible ? 1 : 0,
  };
}
