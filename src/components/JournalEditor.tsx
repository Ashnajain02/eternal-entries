
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
import AIPrompt from './journal/AIPrompt';
import { supabase } from '@/integrations/supabase/client';

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
  const [isSpotifySearchOpen, setIsSpotifySearchOpen] = useState(false);
  const [spotifyConnected, setSpotifyConnected] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState(initialEntry?.track || entry.track || null);
  
  // AI prompt states
  const [aiPrompt, setAiPrompt] = useState<string | null>(initialEntry?.ai_prompt || null);
  const [aiResponse, setAiResponse] = useState<string | null>(initialEntry?.ai_response || null);
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);
  const [lastAnalyzedContent, setLastAnalyzedContent] = useState('');
  
  // Check if Spotify is connected
  useEffect(() => {
    const checkSpotify = async () => {
      const connected = await isSpotifyConnected();
      setSpotifyConnected(connected);
    };
    
    checkSpotify();
  }, []);
  
  // Auto-save on content changes (debounced to avoid too many saves)
  useEffect(() => {
    const autoSaveTimer = setTimeout(() => {
      if (content.trim()) {
        saveDraft({
          ...entry,
          content,
          mood: selectedMood,
          weather: weatherData || undefined,
          track: selectedTrack,
          ai_prompt: aiPrompt,
          ai_response: aiResponse,
          timestamp: entry.timestamp || new Date().toISOString(), // Preserve original timestamp
        });
      }
    }, 5000); // Auto-save 5 seconds after typing stops
    
    return () => clearTimeout(autoSaveTimer);
  }, [content, selectedMood, weatherData, selectedTrack, aiPrompt, aiResponse, entry, saveDraft]);
  
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

  // Effect to generate AI prompt when content reaches sufficient length
  useEffect(() => {
    const shouldGeneratePrompt = 
      content.length > 50 && 
      content.trim() !== lastAnalyzedContent.trim() && 
      content.split(/\s+/).length >= 10 && 
      !aiPrompt && 
      !isGeneratingPrompt;
    
    if (shouldGeneratePrompt) {
      generateAIPrompt(content);
    }
  }, [content, lastAnalyzedContent, aiPrompt, isGeneratingPrompt]);

  // Function to generate AI prompt
  const generateAIPrompt = async (journalContent: string) => {
    setIsGeneratingPrompt(true);
    setLastAnalyzedContent(journalContent);
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-prompt', {
        body: { journalContent }
      });
      
      if (error) throw error;
      
      if (data && data.prompt) {
        setAiPrompt(data.prompt);
      }
    } catch (error) {
      console.error('Error generating AI prompt:', error);
      // We don't show an error toast here to avoid disrupting the user's writing flow
    } finally {
      setIsGeneratingPrompt(false);
    }
  };

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
        ai_prompt: aiPrompt,
        ai_response: aiResponse,
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
    // Use the existing Spotify auth flow
    window.location.href = '/settings?tab=integrations';
  };

  const handleAddSong = () => {
    setIsSpotifySearchOpen(true);
  };

  const handleRemoveTrack = () => {
    setSelectedTrack(undefined);
    
    // Also update the draft
    saveDraft({
      ...entry,
      content,
      mood: selectedMood,
      weather: weatherData || undefined,
      track: undefined,
      timestamp: entry.timestamp || new Date().toISOString(),
    });
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
        
        {/* AI Prompt Section */}
        {(aiPrompt || isGeneratingPrompt) && (
          <div className="mb-6">
            {isGeneratingPrompt ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Generating reflection prompt...</span>
              </div>
            ) : (
              <AIPrompt 
                prompt={aiPrompt} 
                response={aiResponse} 
                onResponseChange={setAiResponse} 
              />
            )}
          </div>
        )}
        
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
