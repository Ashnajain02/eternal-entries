
import React, { useState, useEffect } from 'react';
import { JournalEntry } from '@/types';
import { useJournal } from '@/contexts/JournalContext';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import SpotifySection from './SpotifySection';
import { useJournalDraft } from '@/hooks/useJournalDraft';
import { useWeatherData } from '@/hooks/useWeatherData';
import { useSpotifyConnection } from '@/hooks/useSpotifyConnection';
import MoodSelector from '@/components/MoodSelector';
import WeatherDisplay from '@/components/WeatherDisplay';
import RichTextEditor from './RichTextEditor';
import { motion } from 'framer-motion';
import { X, Check } from 'lucide-react';

interface JournalEditorContainerProps {
  entry?: JournalEntry;
  onSave?: () => void;
}

const JournalEditorContainer: React.FC<JournalEditorContainerProps> = ({
  entry: initialEntry,
  onSave
}) => {
  const { addEntry, updateEntry, createNewEntry } = useJournal();
  const { toast } = useToast();
  
  const { entry, setEntry, saveDraft, saveImmediately, clearDraft, markAsSaved, lastAutoSave } = useJournalDraft(initialEntry, createNewEntry);
  const { 
    weatherData, 
    isLoadingWeather, 
    locationError, 
    handleGetWeather 
  } = useWeatherData(initialEntry?.weather || entry.weather);
  
  const { spotifyConnected, handleSpotifyConnect } = useSpotifyConnection();
  
  const [content, setContent] = useState(initialEntry?.content || entry.content || '');
  const [selectedMood, setSelectedMood] = useState(initialEntry?.mood || entry.mood || 'neutral');
  const [selectedTrack, setSelectedTrack] = useState(initialEntry?.track || entry.track);
  const [isSaving, setIsSaving] = useState(false);
  
  useEffect(() => {
    if (!entry.date || !entry.timestamp) {
      const now = new Date();
      const isoDate = now.toISOString().split('T')[0];
  
      setEntry({
        ...entry,
        date: entry.date || isoDate,
        timestamp: entry.timestamp || now.toISOString(),
      });
    }
  }, [entry, setEntry]);

  // Auto-save draft
  useEffect(() => {
    const draftEntry: JournalEntry = {
      ...entry,
      content,
      mood: selectedMood,
      track: selectedTrack,
      weather: weatherData || undefined,
    };
    saveDraft(draftEntry);
  }, [content, selectedMood, selectedTrack, weatherData, saveDraft, entry]);

  const entryDate = entry.date
    ? new Date(entry.date + 'T00:00:00')
    : new Date();
  
  const formattedDate = format(entryDate, 'EEEE, MMMM d');
  const formattedYear = format(entryDate, 'yyyy');

  const handleSave = async () => {
    // Strip HTML tags to check if there's actual content
    const textContent = content.replace(/<[^>]*>/g, '').trim();
    if (!textContent) {
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
          title: "Entry updated",
          description: "Your journal entry has been saved."
        });
      } else {
        await addEntry(updatedEntry);
        toast({
          title: "Entry saved",
          description: "Your journal entry has been saved."
        });
        markAsSaved();
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
    const textContent = content.replace(/<[^>]*>/g, '').trim();
    if (textContent && (!initialEntry || initialEntry.id.startsWith('temp-'))) {
      const confirmCancel = window.confirm("You have unsaved changes. Discard this entry?");
      if (!confirmCancel) return;
      clearDraft();
    }
    
    if (onSave) {
      onSave();
    }
  };

  const handleSpotifyConnectClick = () => {
    const entryData = {
      ...entry,
      content,
      mood: selectedMood,
      track: selectedTrack,
      weather: weatherData,
      timestamp: entry.timestamp || new Date().toISOString()
    };
    
    handleSpotifyConnect(saveImmediately, entryData);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-card border border-border rounded-md overflow-hidden"
    >
      {/* Header */}
      <div className="px-6 py-5 border-b border-border flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl">{formattedDate}</h2>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{formattedYear}</span>
            {lastAutoSave && (
              <>
                <span>·</span>
                <span>Saved {format(lastAutoSave, 'h:mm a')}</span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <WeatherDisplay 
            weatherData={weatherData} 
            isLoading={isLoadingWeather} 
            onRefresh={handleGetWeather} 
          />
        </div>
      </div>
      
      {locationError && (
        <Alert variant="destructive" className="mx-6 mt-4">
          <AlertDescription>
            {locationError}{' '}
            <Button variant="link" className="p-0 h-auto text-destructive" onClick={handleGetWeather}>
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Spotify */}
      <div className="px-6 py-4 border-b border-border bg-accent/20">
        <SpotifySection
          selectedTrack={selectedTrack}
          onTrackSelect={setSelectedTrack}
          spotifyConnected={spotifyConnected}
          onSpotifyConnect={handleSpotifyConnectClick}
        />
      </div>

      {/* Mood */}
      <div className="px-6 py-4 border-b border-border">
        <MoodSelector selectedMood={selectedMood} onChange={setSelectedMood} />
      </div>
      
      {/* Content - Rich Text Editor */}
      <div className="px-6 py-6">
        <RichTextEditor
          content={content}
          onChange={setContent}
          placeholder="What's on your mind today..."
        />
      </div>
      
      {/* Actions */}
      <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-3">
        <Button 
          variant="ghost" 
          onClick={handleCancel}
          className="text-muted-foreground"
        >
          <X className="h-4 w-4 mr-2" />
          Cancel
        </Button>
        <Button 
          onClick={handleSave} 
          disabled={isSaving}
          className="bg-foreground text-background hover:bg-foreground/90"
        >
          <Check className="h-4 w-4 mr-2" />
          {isSaving ? "Saving..." : "Save Entry"}
        </Button>
      </div>
    </motion.div>
  );
};

export default JournalEditorContainer;
