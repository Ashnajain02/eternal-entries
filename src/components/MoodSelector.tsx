
import React from 'react';
import { Mood, MoodOption } from '@/types';
import { cn } from '@/lib/utils';

interface MoodSelectorProps {
  selectedMood: Mood;
  onChange: (mood: Mood) => void;
  className?: string;
}

const MoodSelector: React.FC<MoodSelectorProps> = ({ selectedMood, onChange, className }) => {
  const moodOptions: MoodOption[] = [
    { value: 'happy', label: 'Happy' },
    { value: 'content', label: 'Content' },
    { value: 'neutral', label: 'Neutral' },
    { value: 'sad', label: 'Sad' },
    { value: 'anxious', label: 'Anxious' },
    { value: 'angry', label: 'Angry' },
    { value: 'emotional', label: 'Emotional' },
    { value: 'in-love', label: 'In Love' },
    { value: 'excited', label: 'Excited' },
    { value: 'tired', label: 'Tired' },
  ];

  return (
    <div className={cn("flex flex-col sm:flex-row sm:items-center gap-3", className)}>
      <p className="text-sm text-muted-foreground">How are you feeling?</p>
      <div className="flex flex-wrap gap-2">
        {moodOptions.map((mood) => (
          <button
            key={mood.value}
            onClick={() => onChange(mood.value)}
            className={cn(
              "px-3 py-1.5 text-sm rounded-full border transition-all duration-200",
              selectedMood === mood.value 
                ? "bg-foreground text-background border-foreground" 
                : "bg-transparent text-muted-foreground border-border hover:border-foreground hover:text-foreground"
            )}
          >
            {mood.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default MoodSelector;
