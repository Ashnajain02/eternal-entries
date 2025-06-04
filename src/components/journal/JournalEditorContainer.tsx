
import React, { useState, useEffect } from 'react';
import { JournalEntry } from '@/types';
import { useJournal } from '@/contexts/JournalContext';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import EditorHeader from './EditorHeader';
import EditorControls from './EditorControls';
import ContentEditor from './ContentEditor';
import SpotifySection from './SpotifySection';
import { useJournalDraft } from '@/hooks/useJournalDraft';
import { useWeatherData } from '@/hooks/useWeatherData';
import { useSpotifyConnection } from '@/hooks/useSpotifyConnection';
import { useJournalEditorState } from '@/hooks/useJournalEditorState';

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
  
  // Use our custom hooks
  const { entry, setEntry, saveDraft, saveImmediately, clearDraft, markAsSaved, lastAutoSave } = useJournalDraft(initialEntry, createNewEntry);
  const { 
    weatherData, 
    setWeatherData, 
    isLoadingWeather, 
    locationError, 
    handleGetWeather 
  } = useWeatherData(initialEntry?.weather || entry.weather);
  
  const { spotifyConnected, handleSpotifyConnect } = useSpotifyConnection();
  
  const {
    content,
    setContent,
    selectedMood,
    setSelectedMood,
    selectedTrack,
    setSelectedTrack,
    getEntryData
  } = useJournalEditorState({
    initialEntry,
    entry,
    weatherData,
    saveDraft,
    saveImmediately
  });
  
  const [isSaving, setIsSaving] = useState(false);
  
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
        // Mark as saved and clear the draft since we've properly saved it
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
    // Ask for confirmation if there is content and this is a new entry
    if (content.trim() && (!initialEntry || initialEntry.id.startsWith('temp-'))) {
      const confirmCancel = window.confirm("You have unsaved changes. Are you sure you want to exit the editor? Your draft will be deleted.");
      if (!confirmCancel) {
        return;
      }
      // Clear the draft since user confirmed they want to cancel
      clearDraft();
    }
    
    if (onSave) {
      onSave();
    }
  };

  const handleSpotifyConnectClick = () => {
    const entryData = {
      ...getEntryData(),
      ...entry,
      timestamp: entry.timestamp || new Date().toISOString()
    };
    
    handleSpotifyConnect(saveImmediately, entryData);
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
          <SpotifySection
            selectedTrack={selectedTrack}
            onTrackSelect={setSelectedTrack}
            spotifyConnected={spotifyConnected}
            onSpotifyConnect={handleSpotifyConnectClick}
          />
        </div>
        
        <ContentEditor
          content={content}
          onContentChange={setContent}
          selectedMood={selectedMood}
          onMoodChange={setSelectedMood}
        />
        
        <EditorControls
          isSaving={isSaving}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      </div>
    </Card>
  );
};

export default JournalEditorContainer;
