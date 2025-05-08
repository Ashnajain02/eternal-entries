
import React, { useState, useEffect } from 'react';
import { JournalEntry, SpotifyTrack, WeatherData, Mood } from '@/types';
import { useJournal } from '@/contexts/JournalContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import MoodSelector from './MoodSelector';
import WeatherDisplay from './WeatherDisplay';
import { getUserLocation, getWeatherForLocation, DEFAULT_COORDINATES } from '@/utils/weatherUtils';
import { format } from 'date-fns';
import AutoResizeTextarea from './AutoResizeTextarea';

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
  const [isLoadingWeather, setIsLoadingWeather] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Get current weather on first load if not already present
  useEffect(() => {
    if (!weatherData && !isLoadingWeather) {
      handleGetWeather();
    }
  }, []);

  const handleGetWeather = async () => {
    setIsLoadingWeather(true);
    setLocationError(null);
    
    try {
      // Try to get user's location
      const coords = await getUserLocation();
      const data = await getWeatherForLocation(coords.latitude, coords.longitude);
      setWeatherData(data);
    } catch (error) {
      console.error('Error getting weather:', error);
      setLocationError(error instanceof Error ? error.message : "Failed to get location");
      
      // Use fallback coordinates
      try {
        const fallbackData = await getWeatherForLocation(
          DEFAULT_COORDINATES.lat, 
          DEFAULT_COORDINATES.lon
        );
        setWeatherData(fallbackData);
      } catch (fallbackError) {
        console.error('Even fallback weather failed:', fallbackError);
      }
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
        track: undefined, // Remove Spotify track reference
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
  
  // Use the current date in the user's local timezone
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
      
      {locationError && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>
            {locationError} <Button variant="link" className="p-0 h-auto" onClick={handleGetWeather}>Try again</Button>
          </AlertDescription>
        </Alert>
      )}
      
      <div className="mb-6">
        <MoodSelector selectedMood={selectedMood} onChange={setSelectedMood} />
      </div>
      
      <div className="mb-6">
        <AutoResizeTextarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write your thoughts here..."
          className="journal-input"
          minHeight="200px"
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
