
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
import AiReflection from './journal/AiReflection';

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
  
  // Use our new custom hooks
  const { entry, setEntry, saveDraft, clearDraft, lastAutoSave } = useJournalDraft(initialEntry, createNewEntry);
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
  const [showReflection, setShowReflection] = useState(false);
  
  // Auto-save on content changes (debounced to avoid too many saves)
  useEffect(() => {
    const autoSaveTimer = setTimeout(() => {
      if (content.trim()) {
        saveDraft({
          ...entry,
          content,
          mood: selectedMood,
          weather: weatherData || undefined,
          timestamp: entry.timestamp || new Date().toISOString(), // Preserve original timestamp
        });
      }
    }, 5000); // Auto-save 5 seconds after typing stops
    
    return () => clearTimeout(autoSaveTimer);
  }, [content, selectedMood, weatherData, entry, saveDraft]);
  
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
        clearDraft();
      }

      // Show reflection option after saving
      setShowReflection(true);
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
        
        {showReflection && (
          <AiReflection entryContent={content} className="mb-6" />
        )}
        
        <EditorControls
          isSaving={isSaving}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      </div>
    </Card>
  );
};

export default JournalEditor;
