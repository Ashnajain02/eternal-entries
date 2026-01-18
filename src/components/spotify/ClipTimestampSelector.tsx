import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Clock } from 'lucide-react';

interface ClipTimestampSelectorProps {
  clipStartSeconds: number;
  clipEndSeconds: number;
  onStartChange: (seconds: number) => void;
  onEndChange: (seconds: number) => void;
  maxDuration?: number; // Maximum allowed duration in seconds
}

const ClipTimestampSelector: React.FC<ClipTimestampSelectorProps> = ({
  clipStartSeconds,
  clipEndSeconds,
  onStartChange,
  onEndChange,
  maxDuration = 300 // 5 minutes default max
}) => {
  // Parse seconds into minutes and seconds for display
  const parseToMinSec = (totalSeconds: number) => ({
    min: Math.floor(totalSeconds / 60),
    sec: totalSeconds % 60
  });

  const [startTime, setStartTime] = useState(parseToMinSec(clipStartSeconds));
  const [endTime, setEndTime] = useState(parseToMinSec(clipEndSeconds));

  // Update local state when props change
  useEffect(() => {
    setStartTime(parseToMinSec(clipStartSeconds));
  }, [clipStartSeconds]);

  useEffect(() => {
    setEndTime(parseToMinSec(clipEndSeconds));
  }, [clipEndSeconds]);

  const handleStartMinChange = (value: string) => {
    const min = Math.max(0, Math.min(parseInt(value) || 0, Math.floor(maxDuration / 60)));
    setStartTime(prev => ({ ...prev, min }));
    const totalSeconds = min * 60 + startTime.sec;
    if (totalSeconds < clipEndSeconds) {
      onStartChange(totalSeconds);
    }
  };

  const handleStartSecChange = (value: string) => {
    const sec = Math.max(0, Math.min(parseInt(value) || 0, 59));
    setStartTime(prev => ({ ...prev, sec }));
    const totalSeconds = startTime.min * 60 + sec;
    if (totalSeconds < clipEndSeconds) {
      onStartChange(totalSeconds);
    }
  };

  const handleEndMinChange = (value: string) => {
    const min = Math.max(0, Math.min(parseInt(value) || 0, Math.floor(maxDuration / 60)));
    setEndTime(prev => ({ ...prev, min }));
    const totalSeconds = min * 60 + endTime.sec;
    if (totalSeconds > clipStartSeconds && totalSeconds <= maxDuration) {
      onEndChange(totalSeconds);
    }
  };

  const handleEndSecChange = (value: string) => {
    const sec = Math.max(0, Math.min(parseInt(value) || 0, 59));
    setEndTime(prev => ({ ...prev, sec }));
    const totalSeconds = endTime.min * 60 + sec;
    if (totalSeconds > clipStartSeconds && totalSeconds <= maxDuration) {
      onEndChange(totalSeconds);
    }
  };

  // Validate and commit on blur
  const handleStartBlur = () => {
    const totalSeconds = startTime.min * 60 + startTime.sec;
    const validStart = Math.min(totalSeconds, clipEndSeconds - 1);
    setStartTime(parseToMinSec(validStart));
    onStartChange(validStart);
  };

  const handleEndBlur = () => {
    const totalSeconds = endTime.min * 60 + endTime.sec;
    const validEnd = Math.max(totalSeconds, clipStartSeconds + 1);
    const clampedEnd = Math.min(validEnd, maxDuration);
    setEndTime(parseToMinSec(clampedEnd));
    onEndChange(clampedEnd);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Clock className="h-4 w-4" />
        <span>Set clip timestamps</span>
      </div>
      
      <div className="flex items-center gap-4">
        {/* Start time */}
        <div className="flex-1">
          <Label className="text-xs text-muted-foreground mb-1 block">Start</Label>
          <div className="flex items-center gap-1">
            <Input
              type="number"
              min={0}
              max={Math.floor(maxDuration / 60)}
              value={startTime.min}
              onChange={(e) => handleStartMinChange(e.target.value)}
              onBlur={handleStartBlur}
              className="w-14 h-8 text-center text-sm"
              aria-label="Start minutes"
            />
            <span className="text-muted-foreground">:</span>
            <Input
              type="number"
              min={0}
              max={59}
              value={startTime.sec.toString().padStart(2, '0')}
              onChange={(e) => handleStartSecChange(e.target.value)}
              onBlur={handleStartBlur}
              className="w-14 h-8 text-center text-sm"
              aria-label="Start seconds"
            />
          </div>
        </div>

        <span className="text-muted-foreground mt-5">to</span>

        {/* End time */}
        <div className="flex-1">
          <Label className="text-xs text-muted-foreground mb-1 block">End</Label>
          <div className="flex items-center gap-1">
            <Input
              type="number"
              min={0}
              max={Math.floor(maxDuration / 60)}
              value={endTime.min}
              onChange={(e) => handleEndMinChange(e.target.value)}
              onBlur={handleEndBlur}
              className="w-14 h-8 text-center text-sm"
              aria-label="End minutes"
            />
            <span className="text-muted-foreground">:</span>
            <Input
              type="number"
              min={0}
              max={59}
              value={endTime.sec.toString().padStart(2, '0')}
              onChange={(e) => handleEndSecChange(e.target.value)}
              onBlur={handleEndBlur}
              className="w-14 h-8 text-center text-sm"
              aria-label="End seconds"
            />
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Clip duration: {Math.floor((clipEndSeconds - clipStartSeconds) / 60)}:{((clipEndSeconds - clipStartSeconds) % 60).toString().padStart(2, '0')}
      </p>
    </div>
  );
};

export default ClipTimestampSelector;
