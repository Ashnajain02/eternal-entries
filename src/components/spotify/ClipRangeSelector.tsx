import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause, Clock, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSpotifyPlayback } from '@/contexts/SpotifyPlaybackContext';
import { formatTime } from '@/utils/formatTime';

interface ClipRangeSelectorProps {
  trackUri: string;
  clipStartSeconds: number;
  clipEndSeconds: number;
  onStartChange: (seconds: number) => void;
  onEndChange: (seconds: number) => void;
  maxDuration?: number;
  entryId?: string;
}

const ClipRangeSelector: React.FC<ClipRangeSelectorProps> = ({
  trackUri,
  clipStartSeconds,
  clipEndSeconds,
  onStartChange,
  onEndChange,
  maxDuration = 300,
  entryId = 'editor-preview'
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState<'start' | 'end' | 'range' | null>(null);
  const [dragStartX, setDragStartX] = useState(0);
  const [initialStart, setInitialStart] = useState(clipStartSeconds);
  const [initialEnd, setInitialEnd] = useState(clipEndSeconds);

  const {
    isReady,
    isInitializing,
    isPlaying,
    currentClip,
    position,
    playClip,
    pauseClip
  } = useSpotifyPlayback();

  const isPreviewPlaying = currentClip?.entryId === entryId && isPlaying;
  const isPreviewActive = currentClip?.entryId === entryId;
  const isPreviewLoading = currentClip?.entryId === entryId && isInitializing && !isPlaying;

  // Calculate progress within the clip for playhead
  const clipDuration = clipEndSeconds - clipStartSeconds;
  const playheadPosition = isPreviewActive && isPlaying
    ? Math.min(100, Math.max(0, ((position - clipStartSeconds) / clipDuration) * 100))
    : 0;

  // Convert pixel position to seconds
  const pxToSeconds = useCallback((px: number): number => {
    if (!trackRef.current) return 0;
    const trackWidth = trackRef.current.offsetWidth;
    return Math.round((px / trackWidth) * maxDuration);
  }, [maxDuration]);

  // Convert seconds to percentage
  const secondsToPercent = (seconds: number): number => {
    return (seconds / maxDuration) * 100;
  };

  // Handle mouse down on handles or range
  const handleMouseDown = useCallback((e: React.MouseEvent, type: 'start' | 'end' | 'range') => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(type);
    setDragStartX(e.clientX);
    setInitialStart(clipStartSeconds);
    setInitialEnd(clipEndSeconds);
  }, [clipStartSeconds, clipEndSeconds]);

  // Handle mouse move
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!trackRef.current) return;
      
      const deltaX = e.clientX - dragStartX;
      const deltaSeconds = pxToSeconds(deltaX);
      const minClipDuration = 5;

      if (isDragging === 'start') {
        const newStart = Math.max(0, Math.min(initialStart + deltaSeconds, initialEnd - minClipDuration));
        onStartChange(newStart);
      } else if (isDragging === 'end') {
        const newEnd = Math.max(initialStart + minClipDuration, Math.min(initialEnd + deltaSeconds, maxDuration));
        onEndChange(newEnd);
      } else if (isDragging === 'range') {
        const rangeDuration = initialEnd - initialStart;
        let newStart = initialStart + deltaSeconds;
        let newEnd = initialEnd + deltaSeconds;
        
        if (newStart < 0) {
          newStart = 0;
          newEnd = rangeDuration;
        }
        if (newEnd > maxDuration) {
          newEnd = maxDuration;
          newStart = maxDuration - rangeDuration;
        }
        
        onStartChange(newStart);
        onEndChange(newEnd);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStartX, initialStart, initialEnd, pxToSeconds, maxDuration, onStartChange, onEndChange]);

  // Touch support
  const handleTouchStart = useCallback((e: React.TouchEvent, type: 'start' | 'end' | 'range') => {
    e.stopPropagation();
    const touch = e.touches[0];
    setIsDragging(type);
    setDragStartX(touch.clientX);
    setInitialStart(clipStartSeconds);
    setInitialEnd(clipEndSeconds);
  }, [clipStartSeconds, clipEndSeconds]);

  useEffect(() => {
    if (!isDragging) return;

    const handleTouchMove = (e: TouchEvent) => {
      if (!trackRef.current) return;
      const touch = e.touches[0];
      
      const deltaX = touch.clientX - dragStartX;
      const deltaSeconds = pxToSeconds(deltaX);
      const minClipDuration = 5;

      if (isDragging === 'start') {
        const newStart = Math.max(0, Math.min(initialStart + deltaSeconds, initialEnd - minClipDuration));
        onStartChange(newStart);
      } else if (isDragging === 'end') {
        const newEnd = Math.max(initialStart + minClipDuration, Math.min(initialEnd + deltaSeconds, maxDuration));
        onEndChange(newEnd);
      } else if (isDragging === 'range') {
        const rangeDuration = initialEnd - initialStart;
        let newStart = initialStart + deltaSeconds;
        let newEnd = initialEnd + deltaSeconds;
        
        if (newStart < 0) {
          newStart = 0;
          newEnd = rangeDuration;
        }
        if (newEnd > maxDuration) {
          newEnd = maxDuration;
          newStart = maxDuration - rangeDuration;
        }
        
        onStartChange(newStart);
        onEndChange(newEnd);
      }
    };

    const handleTouchEnd = () => {
      setIsDragging(null);
    };

    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, dragStartX, initialStart, initialEnd, pxToSeconds, maxDuration, onStartChange, onEndChange]);

  // CRITICAL: This handler must be synchronous for mobile gesture chain
  const handlePlayPause = useCallback(() => {
    if (isPreviewPlaying) {
      pauseClip(); // Fire and forget
    } else {
      // playClip is synchronous - it activates audio context immediately
      playClip({
        entryId,
        trackUri,
        clipStartSeconds,
        clipEndSeconds
      });
    }
  }, [isPreviewPlaying, pauseClip, playClip, entryId, trackUri, clipStartSeconds, clipEndSeconds]);

  // Stop preview when component unmounts
  useEffect(() => {
    return () => {
      if (isPreviewPlaying) {
        pauseClip();
      }
    };
  }, [isPreviewPlaying, pauseClip]);

  const startPercent = secondsToPercent(clipStartSeconds);
  const endPercent = secondsToPercent(clipEndSeconds);
  const rangeWidth = endPercent - startPercent;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>Select clip range</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handlePlayPause}
          disabled={isPreviewLoading}
          className="h-8 px-3"
        >
          {isPreviewLoading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              Loading
            </>
          ) : isPreviewPlaying ? (
            <>
              <Pause className="h-3.5 w-3.5 mr-1.5" />
              Pause
            </>
          ) : (
            <>
              <Play className="h-3.5 w-3.5 mr-1.5" />
              Preview
            </>
          )}
        </Button>
      </div>

      {/* Timeline Track */}
      <div 
        ref={trackRef}
        className="relative h-10 bg-muted rounded-md cursor-pointer select-none touch-none"
      >
        {/* Inactive regions (dimmed) */}
        <div 
          className="absolute top-0 left-0 h-full bg-muted-foreground/10 rounded-l-md"
          style={{ width: `${startPercent}%` }}
        />
        <div 
          className="absolute top-0 right-0 h-full bg-muted-foreground/10 rounded-r-md"
          style={{ width: `${100 - endPercent}%` }}
        />

        {/* Selected range (highlighted) */}
        <div
          className={cn(
            "absolute top-0 h-full bg-primary/30 cursor-grab transition-colors",
            isDragging === 'range' && "cursor-grabbing bg-primary/40"
          )}
          style={{ 
            left: `${startPercent}%`, 
            width: `${rangeWidth}%` 
          }}
          onMouseDown={(e) => handleMouseDown(e, 'range')}
          onTouchStart={(e) => handleTouchStart(e, 'range')}
        >
          {/* Playhead indicator */}
          {isPreviewActive && isPreviewPlaying && (
            <div 
              className="absolute top-0 h-full w-0.5 bg-foreground z-10 transition-all"
              style={{ left: `${playheadPosition}%` }}
            />
          )}
        </div>

        {/* Start handle */}
        <div
          className={cn(
            "absolute top-0 h-full w-3 bg-primary rounded-l cursor-ew-resize flex items-center justify-center",
            "hover:bg-primary/90 transition-colors",
            isDragging === 'start' && "bg-primary/80"
          )}
          style={{ left: `calc(${startPercent}% - 6px)` }}
          onMouseDown={(e) => handleMouseDown(e, 'start')}
          onTouchStart={(e) => handleTouchStart(e, 'start')}
        >
          <div className="w-0.5 h-4 bg-primary-foreground/50 rounded-full" />
        </div>

        {/* End handle */}
        <div
          className={cn(
            "absolute top-0 h-full w-3 bg-primary rounded-r cursor-ew-resize flex items-center justify-center",
            "hover:bg-primary/90 transition-colors",
            isDragging === 'end' && "bg-primary/80"
          )}
          style={{ left: `calc(${endPercent}% - 6px)` }}
          onMouseDown={(e) => handleMouseDown(e, 'end')}
          onTouchStart={(e) => handleTouchStart(e, 'end')}
        >
          <div className="w-0.5 h-4 bg-primary-foreground/50 rounded-full" />
        </div>

        {/* Time markers */}
        <div className="absolute -bottom-5 left-0 text-xs text-muted-foreground">
          0:00
        </div>
        <div className="absolute -bottom-5 right-0 text-xs text-muted-foreground">
          {formatTime(maxDuration)}
        </div>
      </div>

      {/* Time display */}
      <div className="flex items-center justify-between pt-4">
        <div className="text-sm">
          <span className="text-muted-foreground">Start: </span>
          <span className="font-medium">{formatTime(clipStartSeconds)}</span>
        </div>
        <div className="text-sm text-muted-foreground">
          Duration: {formatTime(clipDuration)}
        </div>
        <div className="text-sm">
          <span className="text-muted-foreground">End: </span>
          <span className="font-medium">{formatTime(clipEndSeconds)}</span>
        </div>
      </div>
    </div>
  );
};

export default ClipRangeSelector;
