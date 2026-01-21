import React from 'react';
import { Button } from '@/components/ui/button';
import { CloudRain, CloudSnow, Cloud, Sun, Moon, Sparkles } from 'lucide-react';
import { WeatherCategory, TimeOfDay } from './types';
import { cn } from '@/lib/utils';

interface WeatherAnimationButtonProps {
  category: WeatherCategory;
  timeOfDay: TimeOfDay;
  isPlaying: boolean;
  onClick: () => void;
  className?: string;
}

const WEATHER_ICONS: Record<WeatherCategory, React.ComponentType<{ className?: string }>> = {
  rain: CloudRain,
  snow: CloudSnow,
  fog: Cloud,
  clear: Sparkles,
};

const WeatherAnimationButton: React.FC<WeatherAnimationButtonProps> = ({
  category,
  timeOfDay,
  isPlaying,
  onClick,
  className,
}) => {
  const WeatherIcon = WEATHER_ICONS[category];
  const TimeIcon = timeOfDay === 'night' ? Moon : Sun;
  
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      disabled={isPlaying}
      className={cn(
        "text-xs text-muted-foreground hover:text-foreground gap-1.5 h-7 px-2",
        "opacity-70 hover:opacity-100 transition-opacity",
        isPlaying && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      <WeatherIcon className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">
        {isPlaying ? 'Playing...' : 'Play Atmosphere'}
      </span>
      <span className="sm:hidden">
        {isPlaying ? '...' : 'Play'}
      </span>
    </Button>
  );
};

export default WeatherAnimationButton;
