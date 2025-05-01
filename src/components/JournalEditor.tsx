
import React, { useState, useEffect } from 'react';
import { JournalEntry, SpotifyTrack, WeatherData, Mood } from '@/types';
import { useJournal } from '@/contexts/JournalContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import MoodSelector from './MoodSelector';
import WeatherDisplay from './WeatherDisplay';
import SpotifySearch from './SpotifySearch';
import { fetchWeatherData } from '@/services/api';
import { format } from 'date-fns';

interface JournalEditorProps {
  entry?: JournalEntry;
  onSave?: () => void;
}

const JournalEditor: React.FC<JournalEditorProps> = ({
  entry: initialEntry,
  onSave
}) => {
  const { addEntry, updateEntry, createNewEntry } = useJournal();
  const { toast } = useToast();
  
  const [entry, setEntry] = useState<JournalEntry>(initialEntry || createNewEntry());
  const [content, setContent] = useState(initialEntry?.content || '');
  const [selectedMood, setSelectedMood] = useState<Mood>(initialEntry?.mood || 'neutral');
  const [weatherData, setWeatherData] = useState<WeatherData | null>(initialEntry?.weather || null);
  const [selectedTrack, setSelectedTrack] = useState<SpotifyTrack | undefined>(initialEntry?.track);
  const [isLoadingWeather, setIsLoadingWeather] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Get current weather on first load if not already present
  useEffect(() => {
    if (!weatherData && !isLoadingWeather) {
      handleGetWeather();
    }
  }, []);

  const handleGetWeather = async () => {
    setIsLoadingWeather(true);
    try {
      // In a real app, we would get the user's location first
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          const data = await fetchWeatherData(latitude, longitude);
          setWeatherData(data);
        },
        (error) => {
          console.error('Geolocation error:', error);
          // Fallback to a default location or show error
          fetchWeatherData(40.7128, -74.0060).then(data => setWeatherData(data));
        }
      );
    } catch (error) {
      console.error('Error getting weather:', error);
    } finally {
      setIsLoadingWeather(false);
    }
  };

  const handleSave = async () => {
    if (!content.trim()) {
      toast({
        title: "Cannot save empty entry",
        description: "Please write something in your journal before saving.",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);

    try {
      const updatedEntry: JournalEntry = {
        ...entry,
        content,
        mood: selectedMood,
        weather: weatherData || undefined,
        track: selectedTrack,
      };

      if (initialEntry && initialEntry.id && !initialEntry.id.startsWith('temp-')) {
        await updateEntry(updatedEntry);
        toast({
          title: "Journal updated",
          description: "Your journal entry has been updated successfully."
        });
      } else {
        await addEntry(updatedEntry);
        toast({
          title: "Journal saved",
          description: "Your journal entry has been saved successfully."
        });
      }

      if (onSave) {
        onSave();
      }
    } catch (error) {
      console.error('Error saving journal entry:', error);
    } finally {
      setIsSaving(false);
    }
  };
  
  const formattedDate = format(new Date(entry.date), 'EEEE, MMMM d, yyyy');

  return (
    <Card className="journal-card animated-gradient">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-xl font-semibold">{formattedDate}</h2>
        <WeatherDisplay 
          weatherData={weatherData} 
          isLoading={isLoadingWeather} 
          onRefresh={handleGetWeather} 
        />
      </div>
      
      <div className="mb-6">
        <MoodSelector selectedMood={selectedMood} onChange={setSelectedMood} />
      </div>
      
      <div className="mb-6">
        <SpotifySearch 
          onSelect={setSelectedTrack} 
          selectedTrack={selectedTrack} 
        />
      </div>
      
      <div className="mb-6">
        <Textarea 
          value={content} 
          onChange={(e) => setContent(e.target.value)} 
          placeholder="Write your thoughts here..."
          className="journal-input min-h-[200px]" 
        />
      </div>
      
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onSave}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save Entry"}
        </Button>
      </div>
    </Card>
  );
};

export default JournalEditor;
