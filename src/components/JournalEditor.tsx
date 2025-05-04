
import React, { useState, useEffect } from 'react';
import { JournalEntry, SpotifyTrack, WeatherData, Mood } from '@/types';
import { useJournal } from '@/contexts/JournalContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import MoodSelector from './MoodSelector';
import WeatherDisplay from './WeatherDisplay';
import { fetchWeatherData } from '@/services/api';
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
  const [locationRequested, setLocationRequested] = useState(false);
  const [locationAttempts, setLocationAttempts] = useState(0);

  // Default coordinates for different regions - used as fallbacks
  const defaultCoordinates = {
    // Manhattan, New York City
    nyc: { lat: 40.7831, lon: -73.9712 },
    // San Francisco
    sf: { lat: 37.7749, lon: -122.4194 },
    // Chicago
    chicago: { lat: 41.8781, lon: -87.6298 }
  };

  // Get current weather on first load if not already present
  useEffect(() => {
    if (!weatherData && !isLoadingWeather && !locationRequested) {
      handleGetWeather();
    }
  }, []);

  const handleGetWeather = async () => {
    setIsLoadingWeather(true);
    setLocationError(null);
    setLocationRequested(true);
    
    try {
      // Check if we've tried multiple times and should fall back immediately
      if (locationAttempts >= 2) {
        console.log("Using fallback location after multiple failed attempts");
        // Use NYC as primary fallback for better east coast coverage
        const data = await fetchWeatherData(defaultCoordinates.nyc.lat, defaultCoordinates.nyc.lon);
        setWeatherData(data);
        setIsLoadingWeather(false);
        return;
      }
      
      // Use the browser's geolocation API to get the user's coordinates
      if (!navigator.geolocation) {
        console.log("Geolocation not supported by browser");
        setLocationError("Geolocation is not supported by your browser");
        // Fall back to NYC coordinates as fallback
        const data = await fetchWeatherData(defaultCoordinates.nyc.lat, defaultCoordinates.nyc.lon);
        setWeatherData(data);
        return;
      }
      
      // Request location from user with a timeout
      const positionPromise = new Promise<GeolocationPosition>((resolve, reject) => {
        // Set a shorter timeout to improve user experience
        const timeoutDuration = 5000; // 5 seconds
        
        navigator.geolocation.getCurrentPosition(
          // Success callback
          (position) => {
            resolve(position);
          },
          // Error callback
          (error) => {
            console.error('Geolocation error:', error);
            let errorMsg = "Location access denied";
            
            switch(error.code) {
              case error.PERMISSION_DENIED:
                errorMsg = "You denied permission to access your location";
                break;
              case error.POSITION_UNAVAILABLE:
                errorMsg = "Location information is unavailable";
                break;
              case error.TIMEOUT:
                errorMsg = "The request to get your location timed out";
                break;
              default:
                errorMsg = "An unknown error occurred";
            }
            
            reject(new Error(errorMsg));
          },
          // Options
          {
            enableHighAccuracy: false, // Set to false to prioritize speed over accuracy
            timeout: timeoutDuration,
            maximumAge: 60000 // Accept positions up to 1 minute old
          }
        );
      });
      
      try {
        const position = await positionPromise;
        const { latitude, longitude } = position.coords;
        console.log(`Successfully got coordinates: ${latitude}, ${longitude}`);
        try {
          const data = await fetchWeatherData(latitude, longitude);
          setWeatherData(data);
        } catch (error) {
          console.error('Error fetching weather data:', error);
          setLocationError("Could not retrieve weather for your location");
          // Fall back to NYC coordinates
          const fallbackData = await fetchWeatherData(defaultCoordinates.nyc.lat, defaultCoordinates.nyc.lon);
          setWeatherData(fallbackData);
        }
      } catch (error: any) {
        console.error('Geolocation promise error:', error);
        setLocationError(error.message || "Could not access your location");
        
        // Fall back to NYC coordinates
        const data = await fetchWeatherData(defaultCoordinates.nyc.lat, defaultCoordinates.nyc.lon);
        setWeatherData(data);
        
        // Increment attempts counter
        setLocationAttempts(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error getting weather:', error);
      setLocationError("An error occurred while fetching weather data");
      
      // Final fallback
      try {
        const data = await fetchWeatherData(defaultCoordinates.nyc.lat, defaultCoordinates.nyc.lon);
        setWeatherData(data);
      } catch (e) {
        console.error('Even fallback failed:', e);
      }
      
      // Increment attempts counter
      setLocationAttempts(prev => prev + 1);
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
