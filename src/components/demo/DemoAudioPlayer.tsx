import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Music, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { DemoTrack } from '@/data/demoEntries';
import { formatTime } from '@/utils/formatTime';
import { cn } from '@/lib/utils';

interface DemoAudioPlayerProps {
  track: DemoTrack;
  onPlay?: () => void;
  className?: string;
}

const DemoAudioPlayer: React.FC<DemoAudioPlayerProps> = ({ track, onPlay, className }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(30);
  const [loadError, setLoadError] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  // Reset when track changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      setProgress(0);
      setCurrentTime(0);
    }
    setLoadError(false);
  }, [track.id]);

  const updateProgress = () => {
    const audio = audioRef.current;
    if (!audio) return;
    const dur = audio.duration || 30;
    setCurrentTime(audio.currentTime);
    setProgress((audio.currentTime / dur) * 100);
    if (!audio.paused) {
      animFrameRef.current = requestAnimationFrame(updateProgress);
    }
  };

  const handlePlayPause = () => {
    if (!track.previewUrl) return;

    if (!audioRef.current) {
      // Lazy-create audio element on first play
      const audio = new Audio();
      audio.preload = 'none';
      audio.src = track.previewUrl;
      audio.onloadedmetadata = () => setDuration(audio.duration);
      audio.onended = () => {
        setIsPlaying(false);
        setProgress(0);
        setCurrentTime(0);
      };
      audio.onerror = () => setLoadError(true);
      audioRef.current = audio;
    }

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    } else {
      audioRef.current.play().then(() => {
        setIsPlaying(true);
        onPlay?.();
        animFrameRef.current = requestAnimationFrame(updateProgress);
      }).catch(() => {
        setLoadError(true);
      });
    }
  };

  if (!track.previewUrl || loadError) {
    return (
      <div className={cn('flex items-center gap-3 p-3 bg-muted/50 rounded-md', className)}>
        {track.albumArt ? (
          <img src={track.albumArt} alt={track.album} className="h-12 w-12 object-cover rounded-sm flex-shrink-0" />
        ) : (
          <div className="h-12 w-12 bg-muted flex items-center justify-center rounded-sm flex-shrink-0">
            <Music className="h-6 w-6 text-muted-foreground" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate text-sm">{track.name}</p>
          <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span className="hidden sm:inline">Preview unavailable</span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col gap-2 p-3 bg-muted/50 rounded-md', className)}>
      <div className="flex items-center gap-3">
        {track.albumArt ? (
          <img src={track.albumArt} alt={track.album} className="h-12 w-12 object-cover rounded-sm flex-shrink-0" />
        ) : (
          <div className="h-12 w-12 bg-muted flex items-center justify-center rounded-sm flex-shrink-0">
            <Music className="h-6 w-6 text-muted-foreground" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <p className="font-medium truncate text-sm">{track.name}</p>
          <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
          onClick={handlePlayPause}
        >
          {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
        </Button>
      </div>

      {isPlaying && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground w-10 text-right">{formatTime(currentTime)}</span>
          <Progress value={progress} className="flex-1 h-1" />
          <span className="text-xs text-muted-foreground w-10">{formatTime(duration)}</span>
        </div>
      )}

      <div className="text-xs text-muted-foreground text-center">
        Spotify preview · 30s
      </div>
    </div>
  );
};

export default DemoAudioPlayer;
