import { useState, useRef, useCallback, useEffect } from 'react';

interface AudioPlayerState {
  isPlaying: boolean;
  isLoading: boolean;
  position: number;
  duration: number;
}

export function useAudioPlayer() {
  const [state, setState] = useState<AudioPlayerState>({
    isPlaying: false,
    isLoading: false,
    position: 0,
    duration: 0,
  });
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const clipEndRef = useRef<number>(30);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearInterval_ = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    clearInterval_();
    setState(prev => ({ ...prev, isPlaying: false }));
  }, []);

  const playClip = useCallback((previewUrl: string, startSeconds: number, endSeconds: number) => {
    // Reuse or create audio element
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }
    const audio = audioRef.current;

    // If same source, just seek
    if (audio.src === previewUrl) {
      audio.currentTime = startSeconds;
    } else {
      audio.src = previewUrl;
      audio.currentTime = startSeconds;
    }

    clipEndRef.current = endSeconds;
    setState(prev => ({ ...prev, isLoading: true }));

    const onCanPlay = () => {
      audio.currentTime = startSeconds;
      audio.play().then(() => {
        setState(prev => ({
          ...prev,
          isPlaying: true,
          isLoading: false,
          duration: audio.duration,
        }));

        // Track position and auto-stop at clip end
        clearInterval_();
        intervalRef.current = setInterval(() => {
          if (audio.currentTime >= clipEndRef.current) {
            pause();
          } else {
            setState(prev => ({ ...prev, position: audio.currentTime }));
          }
        }, 100);
      }).catch(() => {
        setState(prev => ({ ...prev, isLoading: false }));
      });
      audio.removeEventListener('canplay', onCanPlay);
    };

    audio.addEventListener('canplay', onCanPlay);
    audio.load();
  }, [pause]);

  // Cleanup on unmount — remove all listeners and stop audio
  useEffect(() => {
    return () => {
      clearInterval_();
      const audio = audioRef.current;
      if (audio) {
        // Remove any lingering canplay listeners
        audio.oncanplay = null;
        audio.pause();
        audio.src = '';
      }
    };
  }, []);

  return {
    ...state,
    playClip,
    pause,
  };
}
