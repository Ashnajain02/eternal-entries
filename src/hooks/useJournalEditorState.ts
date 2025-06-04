
import { useState, useEffect } from 'react';
import { JournalEntry, Mood, SpotifyTrack } from '@/types';
import { WeatherData } from '@/types';

interface JournalEditorStateProps {
  initialEntry?: JournalEntry;
  entry: JournalEntry;
  weatherData: WeatherData | null;
  saveDraft: (entry: JournalEntry) => void;
  saveImmediately: (entry: JournalEntry) => void;
}

export function useJournalEditorState({
  initialEntry,
  entry,
  weatherData,
  saveDraft,
  saveImmediately
}: JournalEditorStateProps) {
  const [content, setContent] = useState(initialEntry?.content || entry.content || '');
  const [selectedMood, setSelectedMood] = useState<Mood>(initialEntry?.mood || entry.mood || 'neutral');
  const [selectedTrack, setSelectedTrack] = useState(initialEntry?.track || entry.track || null);

  // Auto-save on content changes with debouncing
  useEffect(() => {
    if (content.trim() || selectedMood !== 'neutral' || selectedTrack || weatherData) {
      const updatedEntry = {
        ...entry,
        content,
        mood: selectedMood,
        weather: weatherData || undefined,
        track: selectedTrack,
        timestamp: entry.timestamp || new Date().toISOString(),
      };
      
      saveDraft(updatedEntry);
    }
  }, [content, selectedMood, weatherData, selectedTrack, entry, saveDraft]);

  // Immediate save for critical changes (mood, track selection)
  useEffect(() => {
    if (selectedTrack) {
      const updatedEntry = {
        ...entry,
        content,
        mood: selectedMood,
        weather: weatherData || undefined,
        track: selectedTrack,
        timestamp: entry.timestamp || new Date().toISOString(),
      };
      
      saveImmediately(updatedEntry);
    }
  }, [selectedTrack, entry, content, selectedMood, weatherData, saveImmediately]);

  // Immediate save for mood changes
  useEffect(() => {
    if (selectedMood !== 'neutral') {
      const updatedEntry = {
        ...entry,
        content,
        mood: selectedMood,
        weather: weatherData || undefined,
        track: selectedTrack,
        timestamp: entry.timestamp || new Date().toISOString(),
      };
      
      saveImmediately(updatedEntry);
    }
  }, [selectedMood, entry, content, weatherData, selectedTrack, saveImmediately]);

  const getEntryData = () => ({
    content,
    selectedMood,
    selectedTrack,
    weatherData
  });

  return {
    content,
    setContent,
    selectedMood,
    setSelectedMood,
    selectedTrack,
    setSelectedTrack,
    getEntryData
  };
}
