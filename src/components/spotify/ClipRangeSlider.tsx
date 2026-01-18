import React, { useRef, useState, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface ClipRangeSliderProps {
  trackDuration: number; // in seconds
  clipStart: number; // in seconds
  clipEnd: number; // in seconds
  currentPosition?: number; // playhead position in seconds
  isPlaying?: boolean;
  onRangeChange: (start: number, end: number) => void;
  onSeek?: (position: number) => void;
  className?: string;
}

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const ClipRangeSlider: React.FC<ClipRangeSliderProps> = ({
  trackDuration,
  clipStart,
  clipEnd,
  currentPosition = 0,
  isPlaying = false,
  onRangeChange,
  onSeek,
  className
}) => {
  const sliderRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState<'start' | 'end' | 'range' | null>(null);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartValues, setDragStartValues] = useState({ start: 0, end: 0 });

  // Minimum clip duration (5 seconds)
  const MIN_CLIP_DURATION = 5;
  // Maximum clip duration (60 seconds)
  const MAX_CLIP_DURATION = 60;

  const getPositionFromEvent = useCallback((clientX: number): number => {
    if (!sliderRef.current) return 0;
    const rect = sliderRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, x / rect.width));
    return ratio * trackDuration;
  }, [trackDuration]);

  const handleMouseDown = useCallback((e: React.MouseEvent, type: 'start' | 'end' | 'range') => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(type);
    setDragStartX(e.clientX);
    setDragStartValues({ start: clipStart, end: clipEnd });
  }, [clipStart, clipEnd]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !sliderRef.current) return;

    const rect = sliderRef.current.getBoundingClientRect();
    const deltaX = e.clientX - dragStartX;
    const deltaSec = (deltaX / rect.width) * trackDuration;

    let newStart = clipStart;
    let newEnd = clipEnd;

    if (isDragging === 'start') {
      newStart = Math.max(0, Math.min(dragStartValues.start + deltaSec, clipEnd - MIN_CLIP_DURATION));
      // Ensure we don't exceed max duration
      if (clipEnd - newStart > MAX_CLIP_DURATION) {
        newStart = clipEnd - MAX_CLIP_DURATION;
      }
    } else if (isDragging === 'end') {
      newEnd = Math.min(trackDuration, Math.max(dragStartValues.end + deltaSec, clipStart + MIN_CLIP_DURATION));
      // Ensure we don't exceed max duration
      if (newEnd - clipStart > MAX_CLIP_DURATION) {
        newEnd = clipStart + MAX_CLIP_DURATION;
      }
    } else if (isDragging === 'range') {
      const duration = dragStartValues.end - dragStartValues.start;
      newStart = dragStartValues.start + deltaSec;
      newEnd = dragStartValues.end + deltaSec;
      
      // Clamp to track bounds
      if (newStart < 0) {
        newStart = 0;
        newEnd = duration;
      }
      if (newEnd > trackDuration) {
        newEnd = trackDuration;
        newStart = trackDuration - duration;
      }
    }

    onRangeChange(Math.round(newStart), Math.round(newEnd));
  }, [isDragging, dragStartX, dragStartValues, clipStart, clipEnd, trackDuration, onRangeChange]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(null);
  }, []);

  const handleTrackClick = useCallback((e: React.MouseEvent) => {
    if (isDragging) return;
    
    const position = getPositionFromEvent(e.clientX);
    
    // Only allow seeking within the clip range
    if (position >= clipStart && position <= clipEnd && onSeek) {
      onSeek(Math.round(position));
    }
  }, [isDragging, getPositionFromEvent, clipStart, clipEnd, onSeek]);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Calculate percentages
  const startPercent = (clipStart / trackDuration) * 100;
  const endPercent = (clipEnd / trackDuration) * 100;
  const playheadPercent = (currentPosition / trackDuration) * 100;
  const clipDuration = clipEnd - clipStart;

  return (
    <div className={cn("space-y-2", className)}>
      {/* Time labels */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{formatTime(clipStart)}</span>
        <span className="text-foreground font-medium">
          {formatTime(clipDuration)} clip
        </span>
        <span>{formatTime(clipEnd)}</span>
      </div>

      {/* Slider track */}
      <div 
        ref={sliderRef}
        className="relative h-10 cursor-pointer select-none"
        onClick={handleTrackClick}
      >
        {/* Background track */}
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-2 bg-muted rounded-full" />
        
        {/* Selected range (highlighted clip) */}
        <div 
          className={cn(
            "absolute top-1/2 -translate-y-1/2 h-2 bg-primary/60 rounded-sm cursor-grab transition-colors",
            isDragging === 'range' && "cursor-grabbing bg-primary/80"
          )}
          style={{ 
            left: `${startPercent}%`, 
            width: `${endPercent - startPercent}%` 
          }}
          onMouseDown={(e) => handleMouseDown(e, 'range')}
        />

        {/* Playhead indicator (only within clip range) */}
        {currentPosition >= clipStart && currentPosition <= clipEnd && (
          <div 
            className={cn(
              "absolute top-1/2 -translate-y-1/2 w-0.5 h-4 bg-foreground rounded-full transition-all pointer-events-none z-10",
              isPlaying && "animate-pulse"
            )}
            style={{ left: `${playheadPercent}%` }}
          />
        )}

        {/* Start handle */}
        <div 
          className={cn(
            "absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-6 bg-primary rounded cursor-ew-resize z-20",
            "flex items-center justify-center shadow-md hover:bg-primary/90 transition-colors",
            isDragging === 'start' && "ring-2 ring-primary/50 scale-110"
          )}
          style={{ left: `${startPercent}%` }}
          onMouseDown={(e) => handleMouseDown(e, 'start')}
        >
          <div className="w-0.5 h-3 bg-primary-foreground/60 rounded-full" />
        </div>

        {/* End handle */}
        <div 
          className={cn(
            "absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-6 bg-primary rounded cursor-ew-resize z-20",
            "flex items-center justify-center shadow-md hover:bg-primary/90 transition-colors",
            isDragging === 'end' && "ring-2 ring-primary/50 scale-110"
          )}
          style={{ left: `${endPercent}%` }}
          onMouseDown={(e) => handleMouseDown(e, 'end')}
        >
          <div className="w-0.5 h-3 bg-primary-foreground/60 rounded-full" />
        </div>
      </div>

      {/* Track duration label */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>0:00</span>
        <span>{formatTime(trackDuration)}</span>
      </div>

      {/* Help text */}
      <p className="text-xs text-muted-foreground text-center">
        Drag handles to adjust • Drag center to move clip • Max {MAX_CLIP_DURATION}s
      </p>
    </div>
  );
};

export default ClipRangeSlider;