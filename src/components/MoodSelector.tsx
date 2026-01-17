
import React from 'react';
import { Mood, MoodOption } from '@/types';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip";

interface MoodSelectorProps {
  selectedMood: Mood;
  onChange: (mood: Mood) => void;
  className?: string;
}

const MoodSelector: React.FC<MoodSelectorProps> = ({ selectedMood, onChange, className }) => {
  const moodOptions: MoodOption[] = [
    { value: 'happy', label: 'Happy', emoji: '😄' },
    { value: 'sad', label: 'Sad', emoji: '😔' },
    { value: 'neutral', label: 'Neutral', emoji: '😐' },
    { value: 'angry', label: 'Angry', emoji: '😠' },
    { value: 'emotional', label: 'Emotional', emoji: '🥹' },
    { value: 'in-love', label: 'In Love', emoji: '😍' },
    { value: 'anxious', label: 'Anxious', emoji: '😰' },
    { value: 'excited', label: 'Excited', emoji: '🤩' },
    { value: 'tired', label: 'Tired', emoji: '😴' },
  ];

  return (
    <div className={cn("flex flex-col sm:flex-row sm:items-center gap-3", className)}>
      <p className="text-sm text-muted-foreground">How are you feeling?</p>
      <div className="flex flex-wrap gap-2">
        <TooltipProvider>
          {moodOptions.map((mood) => (
            <Tooltip key={mood.value}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onChange(mood.value)}
                  className={cn(
                    "text-xl p-1.5 rounded-md transition-all duration-200",
                    selectedMood === mood.value 
                      ? "bg-accent scale-110" 
                      : "hover:bg-accent/50 opacity-60 hover:opacity-100"
                  )}
                  aria-label={`Select mood: ${mood.label}`}
                >
                  {mood.emoji}
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                {mood.label}
              </TooltipContent>
            </Tooltip>
          ))}
        </TooltipProvider>
      </div>
    </div>
  );
};

export default MoodSelector;
