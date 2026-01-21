import React from 'react';
import { Button } from '@/components/ui/button';
import { CloudRain, CloudSnow, Cloud, Sparkles, Lock } from 'lucide-react';
import { WeatherCategory } from './types';
import { cn } from '@/lib/utils';

interface WeatherAnimationButtonProps {
  category: WeatherCategory;
  timeOfDay: string;
  isPlaying: boolean;
  onClick: () => void;
  className?: string;
  hasSong?: boolean;
  isSongPlayed?: boolean;
}

const WEATHER_ICONS: Record<WeatherCategory, React.ComponentType<{ className?: string }>> = {
  rain: CloudRain,
  snow: CloudSnow,
  fog: Cloud,
  clear: Sparkles,
};

const WeatherAnimationButton: React.FC<WeatherAnimationButtonProps> = ({
  category,
  isPlaying,
  onClick,
  className,
  hasSong = false,
  isSongPlayed = true,
}) => {
  const WeatherIcon = WEATHER_ICONS[category];
  
  // Gating logic: if song exists, must be played first to unlock
  const isLocked = hasSong && !isSongPlayed;
  const isDisabled = isPlaying || isLocked;
  
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      disabled={isDisabled}
      className={cn(
        "text-xs gap-1.5 h-7 px-2.5 transition-all",
        isLocked 
          ? "text-muted-foreground/50 cursor-not-allowed opacity-50" 
          : "text-muted-foreground hover:text-foreground opacity-70 hover:opacity-100",
        isPlaying && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      {isLocked ? (
        <Lock className="h-3 w-3" />
      ) : (
        <WeatherIcon className="h-3.5 w-3.5" />
      )}
      <span className="hidden sm:inline">
        {isPlaying ? 'Playing...' : 'View weather'}
      </span>
      <span className="sm:hidden">
        {isPlaying ? '...' : 'View weather'}
      </span>
    </Button>
  );
};

export default WeatherAnimationButton;
