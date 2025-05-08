
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
    <div className={cn("flex flex-row items-center gap-3 p-2", className)}>
      <p className="text-sm font-medium text-muted-foreground mr-2">How are you feeling?</p>
      <div className="flex space-x-3">
        <TooltipProvider>
          {moodOptions.map((mood) => (
            <Tooltip key={mood.value}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onChange(mood.value)}
                  className={cn(
                    "mood-emoji relative",
                    selectedMood === mood.value && "after:absolute after:bottom-[-8px] after:left-1/2 after:w-1.5 after:h-1.5 after:bg-journal-purple after:rounded-full after:transform after:-translate-x-1/2"
                  )}
                  aria-label={`Select mood: ${mood.label}`}
                >
                  {mood.emoji}
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
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
