import React, { useState, useEffect, useCallback } from 'react';
import { JournalEntry, WeatherData, Mood } from '@/types';
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

// Key used for local storage of draft entries
const DRAFT_STORAGE_KEY = 'journal_draft_entry';

const JournalEditor: React.FC<JournalEditorProps> = ({
  entry: initialEntry,
  onSave
}) => {
  const { addEntry, updateEntry, createNewEntry } = useJournal();
  const { toast } = useToast();
  
  // Make sure we use the correct current date when creating a new entry
  const [entry, setEntry] = useState<JournalEntry>(() => {
    if (initialEntry) return initialEntry;
    
    // Check if there's a saved draft in localStorage
    const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (savedDraft) {
      try {
        const parsedDraft = JSON.parse(savedDraft);
        // Verify this is a valid journal entry object and not expired
        if (parsedDraft && parsedDraft.content && parsedDraft.date) {
          // Get today's date in YYYY-MM-DD format in the user's local timezone
          const today = new Date().toLocaleDateString('en-CA'); // en-CA produces YYYY-MM-DD format
          
          if (parsedDraft.date === today) {
            toast({
              title: "Draft restored",
              description: "Your unsaved journal entry has been restored."
            });
            return parsedDraft;
          }
        }
      } catch (e) {
        console.error("Error parsing saved draft:", e);
        // Clear invalid draft
        localStorage.removeItem(DRAFT_STORAGE_KEY);
      }
    }
    
    // Create a new entry with the current date - this will use the createNewEntry function
    // that now correctly uses toLocaleDateString('en-CA') to get the current date
    return createNewEntry();
  });

  const [content, setContent] = useState(initialEntry?.content || entry.content || '');
  const [selectedMood, setSelectedMood] = useState<Mood>(initialEntry?.mood || entry.mood || 'neutral');
  const [weatherData, setWeatherData] = useState<WeatherData | null>(initialEntry?.weather || entry.weather || null);
  const [isLoadingWeather, setIsLoadingWeather] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [lastAutoSave, setLastAutoSave] = useState<Date | null>(null);

  // Get current weather on first load if not already present
  useEffect(() => {
    if (!weatherData && !isLoadingWeather) {
      handleGetWeather();
    }
  }, []);

  // Auto-save the draft entry
  const saveDraft = useCallback(() => {
    // Don't auto-save if this is an existing entry that's being edited
    if (initialEntry && initialEntry.id && !initialEntry.id.startsWith('temp-')) {
      return;
    }
    
    // Only save if there's content
    if (!content.trim()) {
      return;
    }
    
    const draftEntry = {
      ...entry,
      content,
      mood: selectedMood,
      weather: weatherData || undefined,
      timestamp: new Date().toISOString(),
    };
    
    try {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draftEntry));
      setLastAutoSave(new Date());
      console.log("Auto-saved draft entry");
    } catch (e) {
      console.error("Error saving draft:", e);
    }
  }, [entry, content, selectedMood, weatherData, initialEntry]);
  
  // Auto-save on content changes (debounced to avoid too many saves)
  useEffect(() => {
    const autoSaveTimer = setTimeout(() => {
      if (content.trim()) {
        saveDraft();
      }
    }, 5000); // Auto-save 5 seconds after typing stops
    
    return () => clearTimeout(autoSaveTimer);
  }, [content, saveDraft]);
  
  // Clear draft when component unmounts if we've saved properly
  useEffect(() => {
    return () => {
      // We only want to clear the draft when navigating away if we've properly saved the entry
      const shouldClearDraft = !content.trim() || !initialEntry?.id?.startsWith('temp-');
      
      if (shouldClearDraft) {
        localStorage.removeItem(DRAFT_STORAGE_KEY);
        console.log("Cleared draft entry on component unmount");
      }
    };
  }, [content, initialEntry]);

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
      
      // Use fallback coordinates - but don't display the location name
      try {
        const fallbackData = await getWeatherForLocation(
          DEFAULT_COORDINATES.lat, 
          DEFAULT_COORDINATES.lon
        );
        // Clear the location when using default coordinates
        fallbackData.location = '';
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
        // Clear the draft since we've properly saved it
        localStorage.removeItem(DRAFT_STORAGE_KEY);
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
  
  const handleCancel = () => {
    // Ask for confirmation if there is content and this is a new entry
    if (content.trim() && (!initialEntry || initialEntry.id.startsWith('temp-'))) {
      const confirmCancel = window.confirm("You have unsaved changes. Your draft has been auto-saved, but are you sure you want to exit the editor?");
      if (!confirmCancel) {
        return;
      }
    }
    
    // If this is a new entry being canceled, we keep the draft
    // The draft will be cleared when the entry is actually saved
    
    if (onSave) {
      onSave();
    }
  };
  
  // Ensure we use the current date in the user's local timezone
  let entryDate;
  try {
    // Parse the date string from entry.date
    entryDate = new Date(entry.date);
    
    // Check if the date is valid
    if (isNaN(entryDate.getTime())) {
      // If invalid, use the current date
      entryDate = new Date();
    }
  } catch (error) {
    // Fallback to current date if there's any error
    entryDate = new Date();
  }
  
  // const formattedDate = format(entryDate, 'EEEE, MMMM d, yyyy');
  const formattedDate = 'Ashna Jain';

  return (
    <Card className="journal-card animated-gradient">
      <div className="p-6">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h2 className="text-xl font-semibold">{formattedDate}</h2>
          <div className="flex items-center gap-2">
            {lastAutoSave && (
              <p className="text-xs text-muted-foreground">
                Auto-saved {format(lastAutoSave, 'h:mm a')}
              </p>
            )}
            <WeatherDisplay 
              weatherData={weatherData} 
              isLoading={isLoadingWeather} 
              onRefresh={handleGetWeather} 
            />
          </div>
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
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Entry"}
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default JournalEditor;
