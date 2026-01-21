import React from 'react';
import { Button } from '@/components/ui/button';
import { Lock } from 'lucide-react';
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
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      disabled={isPlaying || disabled}
      className={cn(
        "text-xs gap-1.5 h-7 px-2 transition-all",
        isLocked 
          ? "text-muted-foreground/50 opacity-50 cursor-not-allowed" 
          : "text-muted-foreground hover:text-foreground opacity-70 hover:opacity-100",
        isPlaying && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      {isLocked && <Lock className="h-3 w-3" />}
      <span>
        {isPlaying ? 'Playing...' : 'View weather'}
      </span>
    </Button>
  );
};

export default WeatherAnimationButton;
