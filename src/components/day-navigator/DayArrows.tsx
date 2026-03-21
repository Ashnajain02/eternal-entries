import React from 'react';
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

interface DayArrowsProps {
  onPrevDay: () => void;
  onNextDay: () => void;
  hasPrevDay: boolean;
  hasNextDay: boolean;
  onPrevEntry?: () => void;
  onNextEntry?: () => void;
  hasPrevEntry?: boolean;
  hasNextEntry?: boolean;
  counterText?: string;
}

const DayArrows: React.FC<DayArrowsProps> = ({
  onPrevDay, onNextDay, hasPrevDay, hasNextDay,
  onPrevEntry, onNextEntry, hasPrevEntry = false, hasNextEntry = false,
  counterText,
}) => {
  const isMobile = useIsMobile();

  const baseClass = cn(
    "fixed z-40 flex items-center justify-center rounded-full transition-all",
    "bg-primary/8 border border-primary/15 text-primary/50",
    "hover:bg-primary/15 hover:border-primary/25 hover:text-primary/80",
    "active:scale-95"
  );

  const sideSize = isMobile ? "h-11 w-11" : "h-12 w-12";
  const sideIconSize = isMobile ? "h-5 w-5" : "h-6 w-6";

  return (
    <>
      {/* Left — previous day */}
      <button
        onClick={onPrevDay}
        disabled={!hasPrevDay}
        className={cn(
          baseClass, sideSize,
          isMobile ? "bottom-6 left-4" : "top-1/2 -translate-y-1/2",
          !hasPrevDay && "opacity-0 pointer-events-none"
        )}
        style={!isMobile ? { left: 'calc(50% - 440px)' } : undefined}
        aria-label="Previous day"
      >
        <ChevronLeft className={sideIconSize} />
      </button>

      {/* Right — next day */}
      <button
        onClick={onNextDay}
        disabled={!hasNextDay}
        className={cn(
          baseClass, sideSize,
          isMobile ? "bottom-6 right-20" : "top-1/2 -translate-y-1/2",
          !hasNextDay && "opacity-0 pointer-events-none"
        )}
        style={!isMobile ? { right: 'calc(50% - 440px)' } : undefined}
        aria-label="Next day"
      >
        <ChevronRight className={sideIconSize} />
      </button>

      {/* Up — previous entry on same day */}
      {onPrevEntry && hasPrevEntry && (
        <button
          onClick={onPrevEntry}
          className={cn(baseClass, "h-10 w-10 left-1/2 -translate-x-1/2", isMobile ? "top-[68px]" : "top-[76px]")}
          aria-label="Previous entry"
        >
          <ChevronUp className="h-5 w-5" />
        </button>
      )}

      {/* Bottom area — counter + down arrow combined */}
      {onNextEntry && (hasNextEntry || counterText) && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-2">
          {hasNextEntry && (
            <button
              onClick={onNextEntry}
              className={cn(baseClass, "relative h-10 w-10")}
              style={{ position: 'relative' }}
              aria-label="Next entry"
            >
              <ChevronDown className="h-5 w-5" />
            </button>
          )}
          {counterText && (
            <span className="text-xs text-muted-foreground/60">
              {counterText}
            </span>
          )}
        </div>
      )}
    </>
  );
};

export default DayArrows;
