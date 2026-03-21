import React from 'react';
import { Lock, CloudSun } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WeatherAnimationButtonProps {
  isPlaying: boolean;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}

const WeatherAnimationButton: React.FC<WeatherAnimationButtonProps> = ({
  isPlaying,
  onClick,
  disabled = false,
  className,
}) => {
  const isLocked = disabled && !isPlaying;

  return (
    <button
      onClick={onClick}
      disabled={isPlaying || disabled}
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all",
        "bg-primary/10 text-primary border border-primary/20",
        "hover:bg-primary/15 hover:border-primary/30 hover:shadow-sm",
        "active:scale-[0.97]",
        isLocked && "opacity-40 cursor-not-allowed",
        isPlaying && "opacity-50 cursor-not-allowed animate-pulse",
        className
      )}
    >
      {isLocked ? (
        <Lock className="h-3 w-3" />
      ) : (
        <CloudSun className="h-3.5 w-3.5" />
      )}
      <span>{isPlaying ? 'Playing...' : 'View weather'}</span>
    </button>
  );
};

export default WeatherAnimationButton;
