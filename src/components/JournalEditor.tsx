
import React, { useState, useEffect } from 'react';
import { JournalEntry, Mood } from '@/types';
import { useJournal } from '@/contexts/JournalContext';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import MoodSelector from './MoodSelector';
import AutoResizeTextarea from './AutoResizeTextarea';
import EditorHeader from './journal/EditorHeader';
import EditorControls from './journal/EditorControls';
import { useJournalDraft } from '@/hooks/useJournalDraft';
import { useWeatherData } from '@/hooks/useWeatherData';
import { isSpotifyConnected } from '@/services/spotify';
import { Music } from 'lucide-react';
import SpotifyTrackSearch from './spotify/SpotifyTrackSearch';
import SpotifyTrackDisplay from './spotify/SpotifyTrackDisplay';
import { useNavigate } from 'react-router-dom';

// Key for storing Spotify redirect information
const SPOTIFY_REDIRECT_KEY = 'spotify_redirect_from_journal';

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
  const navigate = useNavigate();
  
  // Use our custom hooks
  const { entry, setEntry, saveDraft, saveImmediately, clearDraft, lastAutoSave } = useJournalDraft(initialEntry, createNewEntry);
  const { 
    weatherData, 
    setWeatherData, 
    isLoadingWeather, 
    locationError, 
    handleGetWeather 
  } = useWeatherData(initialEntry?.weather || entry.weather);
  
  // Local state for edited values
  const [content, setContent] = useState(initialEntry?.content || entry.content || '');
  const [selectedMood, setSelectedMood] = useState<Mood>(initialEntry?.mood || entry.mood || 'neutral');
  const [isSaving, setIsSaving] = useState(false);
  const [isSpotifySearchOpen, setIsSpotifySearchOpen] = useState(false);
  const [spotifyConnected, setSpotifyConnected] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState(initialEntry?.track || entry.track || null);
  
  // Check if Spotify is connected
  useEffect(() => {
    const checkSpotify = async () => {
      const connected = await isSpotifyConnected();
      setSpotifyConnected(connected);
    };
    
    checkSpotify();
  }, []);
  
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
  
  // Check if we're returning from Spotify auth flow
  useEffect(() => {
    // Check if we have redirect info stored
    const redirectInfo = localStorage.getItem(SPOTIFY_REDIRECT_KEY);
    if (redirectInfo) {
      // We're returning from Spotify auth flow
      // Draft was already saved before redirect, so it should be loaded automatically
      
      // Remove the redirect info as we've now handled the return
      localStorage.removeItem(SPOTIFY_REDIRECT_KEY);
      
      toast({
        title: "Spotify connected",
        description: "You can now add songs to your journal entries."
      });
    }
  }, [toast]);
  
  // Ensure entry has date and timestamp - only set these once when creating a new entry
  useEffect(() => {
    if (!entry.date || !entry.timestamp) {
      const now = new Date();
      const isoDate = now.toISOString().split('T')[0]; // YYYY-MM-DD format
  
      setEntry({
        ...entry,
        date: entry.date || isoDate,
        timestamp: entry.timestamp || now.toISOString(),
      });
    }
  }, [entry, setEntry]);

  // Calculate the entry date for display from the entry's date property
  const entryDate = entry.date
    ? new Date(entry.date + 'T00:00:00') // Add time part to ensure consistent parsing
    : new Date();  

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
      // Always preserve the original timestamp when saving
      const updatedEntry: JournalEntry = {
        ...entry,
        content,
        mood: selectedMood,
        weather: weatherData || undefined,
        track: selectedTrack,
      };

      console.log("Saving entry with track:", selectedTrack);

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
        clearDraft();
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
    
    if (onSave) {
      onSave();
    }
  };

  const handleSpotifyConnect = () => {
    // Save draft immediately before redirecting
    if (content.trim() || selectedMood !== 'neutral' || selectedTrack || weatherData) {
      const updatedEntry = {
        ...entry,
        content,
        mood: selectedMood,
        weather: weatherData || undefined,
        track: selectedTrack,
        timestamp: entry.timestamp || new Date().toISOString(),
      };
      
      saveImmediately(updatedEntry);
      
      // Store information about where we're coming from
      localStorage.setItem(SPOTIFY_REDIRECT_KEY, 'journal_editor');
    }
    
    // Navigate to settings page with integrations tab selected
    navigate('/settings?tab=integrations');
  };

  const handleAddSong = () => {
    setIsSpotifySearchOpen(true);
  };

  const handleRemoveTrack = () => {
    setSelectedTrack(undefined);
  };

  return (
    <Card className="journal-card animated-gradient">
      <div className="p-6">
        <EditorHeader
          entryDate={entryDate}
          weatherData={weatherData}
          isLoadingWeather={isLoadingWeather}
          onRefreshWeather={handleGetWeather}
          lastAutoSave={lastAutoSave}
          locationError={locationError}
        />
        
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
        
        {/* Spotify Track Section */}
        <div className="mb-6">
          {selectedTrack ? (
            <div className="mb-2">
              <SpotifyTrackDisplay 
                track={selectedTrack} 
                onRemove={handleRemoveTrack} 
              />
            </div>
          ) : (
            <div>
              {spotifyConnected ? (
                <Button 
                  variant="outline" 
                  onClick={handleAddSong} 
                  className="w-full border-dashed"
                >
                  <Music className="mr-2 h-4 w-4" />
                  Add song from Spotify
                </Button>
              ) : (
                <Button 
                  variant="outline" 
                  onClick={handleSpotifyConnect} 
                  className="w-full border-dashed"
                >
                  <Music className="mr-2 h-4 w-4" />
                  Connect to Spotify
                </Button>
              )}
            </div>
          )}
        </div>
        
        <EditorControls
          isSaving={isSaving}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      </div>
      
      <SpotifyTrackSearch 
        isOpen={isSpotifySearchOpen} 
        onClose={() => setIsSpotifySearchOpen(false)} 
        onTrackSelect={setSelectedTrack} 
      />
    </Card>
  );
};

export default JournalEditor;
