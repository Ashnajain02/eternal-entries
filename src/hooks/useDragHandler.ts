import { useState, useRef, useCallback, useEffect } from 'react';

export const MIN_CLIP_DURATION = 5; // seconds

type DragType = 'start' | 'end' | 'range' | null;

interface UseDragHandlerProps {
  clipStartSeconds: number;
  clipEndSeconds: number;
  maxDuration: number;
  onStartChange: (seconds: number) => void;
  onEndChange: (seconds: number) => void;
  pxToSeconds: (px: number) => number;
}

interface UseDragHandlerResult {
  isDragging: DragType;
  handleMouseDown: (e: React.MouseEvent, type: 'start' | 'end' | 'range') => void;
  handleTouchStart: (e: React.TouchEvent, type: 'start' | 'end' | 'range') => void;
}

export function useDragHandler({
  clipStartSeconds,
  clipEndSeconds,
  maxDuration,
  onStartChange,
  onEndChange,
  pxToSeconds
}: UseDragHandlerProps): UseDragHandlerResult {
  const [isDragging, setIsDragging] = useState<DragType>(null);
  const dragStartXRef = useRef(0);
  const initialStartRef = useRef(clipStartSeconds);
  const initialEndRef = useRef(clipEndSeconds);

  // Unified handler for drag move (works for both mouse and touch)
  const handleDragMove = useCallback((clientX: number) => {
    const deltaX = clientX - dragStartXRef.current;
    const deltaSeconds = pxToSeconds(deltaX);

    if (isDragging === 'start') {
      const newStart = Math.max(0, Math.min(initialStartRef.current + deltaSeconds, initialEndRef.current - MIN_CLIP_DURATION));
      onStartChange(newStart);
    } else if (isDragging === 'end') {
      const newEnd = Math.max(initialStartRef.current + MIN_CLIP_DURATION, Math.min(initialEndRef.current + deltaSeconds, maxDuration));
      onEndChange(newEnd);
    } else if (isDragging === 'range') {
      const rangeDuration = initialEndRef.current - initialStartRef.current;
      let newStart = initialStartRef.current + deltaSeconds;
      let newEnd = initialEndRef.current + deltaSeconds;

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
  }, [isDragging, pxToSeconds, maxDuration, onStartChange, onEndChange]);

  // Mouse events
  const handleMouseDown = useCallback((e: React.MouseEvent, type: 'start' | 'end' | 'range') => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(type);
    dragStartXRef.current = e.clientX;
    initialStartRef.current = clipStartSeconds;
    initialEndRef.current = clipEndSeconds;
  }, [clipStartSeconds, clipEndSeconds]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => handleDragMove(e.clientX);
    const handleMouseUp = () => setIsDragging(null);

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleDragMove]);

  // Touch events
  const handleTouchStart = useCallback((e: React.TouchEvent, type: 'start' | 'end' | 'range') => {
    e.stopPropagation();
    const touch = e.touches[0];
    setIsDragging(type);
    dragStartXRef.current = touch.clientX;
    initialStartRef.current = clipStartSeconds;
    initialEndRef.current = clipEndSeconds;
  }, [clipStartSeconds, clipEndSeconds]);

  useEffect(() => {
    if (!isDragging) return;

    const handleTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      handleDragMove(touch.clientX);
    };
    const handleTouchEnd = () => setIsDragging(null);

    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, handleDragMove]);

  return {
    isDragging,
    handleMouseDown,
    handleTouchStart
  };
}
