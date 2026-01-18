import React, { useEffect, useCallback } from 'react';
import { SpotifyTrack } from '@/types';
import { Button } from '@/components/ui/button';
import { Play, Pause, Music, AlertCircle } from 'lucide-react';
import { useSpotifyPlayback } from '@/contexts/SpotifyPlaybackContext';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface SpotifyClipPlayerProps {
  track: SpotifyTrack;
  entryId: string;
  clipStartSeconds?: number;
  clipEndSeconds?: number;
  className?: string;
  onPlayStateChange?: (isPlaying: boolean) => void;
}

const SpotifyClipPlayer: React.FC<SpotifyClipPlayerProps> = ({
  track,
  entryId,
  clipStartSeconds = 0,
  clipEndSeconds,
  className = '',
  onPlayStateChange
}) => {
  const {
    isReady,
    isPremium,
    isPlaying,
    currentClip,
    position,
    needsReauth,
    initializePlayer,
    playClip,
    pauseClip
  } = useSpotifyPlayback();

  const isThisClipPlaying = currentClip?.entryId === entryId && isPlaying;
  const isThisClipActive = currentClip?.entryId === entryId;

  // Default clip end to 30 seconds after start if not specified
  const effectiveClipEnd = clipEndSeconds ?? Math.min(clipStartSeconds + 30, 300);
  const clipDuration = effectiveClipEnd - clipStartSeconds;
  
  // Calculate progress within the clip
  const clipProgress = isThisClipActive 
    ? Math.min(100, Math.max(0, ((position - clipStartSeconds) / clipDuration) * 100))
    : 0;

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Notify parent of play state changes
  useEffect(() => {
    onPlayStateChange?.(isThisClipPlaying);
  }, [isThisClipPlaying, onPlayStateChange]);

  // Initialize player on mount if needed
  useEffect(() => {
    if (!isReady && !needsReauth) {
      initializePlayer();
    }
  }, [isReady, needsReauth, initializePlayer]);

  // Cleanup when component unmounts
  useEffect(() => {
    return () => {
      if (isThisClipPlaying) {
        pauseClip();
      }
    };
  }, [isThisClipPlaying, pauseClip]);

  const handlePlayPause = useCallback(async () => {
    if (isThisClipPlaying) {
      await pauseClip();
    } else {
      await playClip({
        entryId,
        trackUri: track.uri,
        clipStartSeconds,
        clipEndSeconds: effectiveClipEnd
      });
    }
  }, [isThisClipPlaying, pauseClip, playClip, entryId, track.uri, clipStartSeconds, effectiveClipEnd]);

  // Premium required message
  if (isPremium === false) {
    return (
      <div className={cn("flex items-center gap-3 p-3 bg-muted/50 rounded-md", className)}>
        {track.albumArt ? (
          <img
            src={track.albumArt}
            alt={track.album}
            className="h-12 w-12 object-cover rounded-sm flex-shrink-0"
          />
        ) : (
          <div className="h-12 w-12 bg-muted flex items-center justify-center rounded-sm flex-shrink-0">
            <Music className="h-6 w-6 text-muted-foreground" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate text-sm">{track.name}</p>
          <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span className="hidden sm:inline">Premium required</span>
        </div>
      </div>
    );
  }

  // Reauth required message
  if (needsReauth) {
    return (
      <div className={cn("flex items-center gap-3 p-3 bg-muted/50 rounded-md", className)}>
        {track.albumArt ? (
          <img
            src={track.albumArt}
            alt={track.album}
            className="h-12 w-12 object-cover rounded-sm flex-shrink-0"
          />
        ) : (
          <div className="h-12 w-12 bg-muted flex items-center justify-center rounded-sm flex-shrink-0">
            <Music className="h-6 w-6 text-muted-foreground" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate text-sm">{track.name}</p>
          <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span className="hidden sm:inline">Reconnect Spotify</span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-2 p-3 bg-muted/50 rounded-md", className)}>
      <div className="flex items-center gap-3">
        {/* Album art */}
        {track.albumArt ? (
          <img
            src={track.albumArt}
            alt={track.album}
            className="h-12 w-12 object-cover rounded-sm flex-shrink-0"
          />
        ) : (
          <div className="h-12 w-12 bg-muted flex items-center justify-center rounded-sm flex-shrink-0">
            <Music className="h-6 w-6 text-muted-foreground" />
          </div>
        )}

        {/* Track info */}
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate text-sm">{track.name}</p>
          <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
        </div>

        {/* Play/Pause button */}
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
          onClick={handlePlayPause}
          disabled={!isReady && !needsReauth}
        >
          {isThisClipPlaying ? (
            <Pause className="h-5 w-5" />
          ) : (
            <Play className="h-5 w-5 ml-0.5" />
          )}
        </Button>
      </div>

      {/* Progress bar (only show when this clip is active) */}
      {isThisClipActive && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground w-10 text-right">
            {formatTime(Math.max(0, position - clipStartSeconds))}
          </span>
          <Progress value={clipProgress} className="flex-1 h-1" />
          <span className="text-xs text-muted-foreground w-10">
            {formatTime(clipDuration)}
          </span>
        </div>
      )}

      {/* Clip range indicator */}
      <div className="text-xs text-muted-foreground text-center">
        Clip: {formatTime(clipStartSeconds)} - {formatTime(effectiveClipEnd)}
      </div>
    </div>
  );
};

export default SpotifyClipPlayer;
