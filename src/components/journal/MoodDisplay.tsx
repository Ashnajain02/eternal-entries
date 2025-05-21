
import React from 'react';
import { Mood } from '@/types';

interface MoodDisplayProps {
  mood: Mood;
}

const MoodDisplay: React.FC<MoodDisplayProps> = ({ mood }) => {
  const moodEmoji = {
    'happy': '😄',
    'content': '😊',
    'neutral': '😐',
    'sad': '😔',
    'anxious': '😰',
    'angry': '😠',
    'emotional': '🥹',
    'in-love': '😍',
    'excited': '🤩',
    'tired': '😴'
  }[mood] || '😐';

  return (
    <div className="mb-4 flex items-center gap-2">
      <span className="text-2xl">{moodEmoji}</span>
      <span className="text-sm text-muted-foreground capitalize">{mood.replace('-', ' ')}</span>
    </div>
  );
};

export default MoodDisplay;
