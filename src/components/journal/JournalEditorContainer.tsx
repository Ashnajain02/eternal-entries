import React, { useState, useEffect, useCallback } from 'react';
import { JournalEntry } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import SpotifySection from './SpotifySection';
import { useWeatherData } from '@/hooks/useWeatherData';
import { useSpotifyConnection } from '@/hooks/useSpotifyConnection';
import MoodSelector from '@/components/MoodSelector';
import WeatherDisplay from '@/components/WeatherDisplay';
import RichTextEditor from './RichTextEditor';
import { motion } from 'framer-motion';
import { Trash2, Save, Send } from 'lucide-react';

interface JournalEditorContainerProps {
  entry: JournalEntry;
  onPublish: () => void;
  onDelete: () => void;
  onClose: () => void;
  onAutoSave: (entry: JournalEntry) => void;
  lastAutoSave: Date | null;
}

const JournalEditorContainer: React.FC<JournalEditorContainerProps> = ({
  entry: initialEntry,
  onPublish,
  onDelete,
  onClose,
  onAutoSave,
  lastAutoSave
}) => {
  const { toast } = useToast();
  
  const [entry, setEntry] = useState<JournalEntry>(initialEntry);
  const { 
    weatherData, 
    isLoadingWeather, 
    locationError, 
    handleGetWeather 
  } = useWeatherData(initialEntry?.weather || entry.weather);
  
  const { spotifyConnected, handleSpotifyConnect } = useSpotifyConnection();
  
  const [content, setContent] = useState(initialEntry?.content || '');
  const [selectedMood, setSelectedMood] = useState(initialEntry?.mood || 'neutral');
  const [selectedTrack, setSelectedTrack] = useState(initialEntry?.track);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Ensure entry has proper date/timestamp
  useEffect(() => {
    if (!entry.date || !entry.timestamp) {
      const now = new Date();
      const isoDate = now.toISOString().split('T')[0];

      setEntry(prev => ({
        ...prev,
        date: prev.date || isoDate,
        timestamp: prev.timestamp || now.toISOString(),
      }));
    }
  }, [entry.date, entry.timestamp]);

  // Keep local entry id in sync with the prop (temp id -> real db id)
  useEffect(() => {
    if (initialEntry.id && initialEntry.id !== entry.id) {
      setEntry(prev => ({ ...prev, id: initialEntry.id }));
    }
  }, [initialEntry.id]);

  // Build current entry state
  const getCurrentEntry = useCallback((): JournalEntry => {
    return {
      ...entry,
      content,
      mood: selectedMood,
      track: selectedTrack,
      weather: weatherData || undefined,
    };
  }, [entry, content, selectedMood, selectedTrack, weatherData]);

  // Auto-save on changes
  useEffect(() => {
    const currentEntry = getCurrentEntry();
    onAutoSave(currentEntry);
  }, [content, selectedMood, selectedTrack, weatherData]);

  const entryDate = entry.date
    ? new Date(entry.date + 'T00:00:00')
    : new Date();
  
  const formattedDate = format(entryDate, 'EEEE, MMMM d');
  const formattedYear = format(entryDate, 'yyyy');

  const handlePublish = async () => {
    const textContent = content.replace(/<[^>]*>/g, '').trim();
    if (!textContent) {
      toast({
        title: "Cannot publish empty entry",
        description: "Please write something in your journal before publishing.",
        variant: "destructive"
      });
      return;
    }

    setIsPublishing(true);
    try {
      onPublish();
    } finally {
      setIsPublishing(false);
    }
  };

  const handleDelete = async () => {
    const textContent = content.replace(/<[^>]*>/g, '').trim();
    const hasContent = textContent || selectedTrack || selectedMood !== 'neutral';
    
    if (hasContent) {
      const confirmDelete = window.confirm("Are you sure you want to delete this entry? This cannot be undone.");
      if (!confirmDelete) return;
    }

    setIsDeleting(true);
    try {
      onDelete();
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSaveAndClose = () => {
    // Auto-save is already happening, just close
    const currentEntry = getCurrentEntry();
    const textContent = content.replace(/<[^>]*>/g, '').trim();
    const hasContent = textContent || selectedTrack || selectedMood !== 'neutral';
    
    if (hasContent) {
      toast({
        title: "Draft saved",
        description: "Your entry has been saved as a draft."
      });
    }
    onClose();
  };

  const handleSpotifyConnectClick = () => {
    const entryData = getCurrentEntry();
    handleSpotifyConnect((data) => {
      // Immediately trigger auto-save before redirect
      onAutoSave(data || entryData);
    }, entryData);
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
                <span>Auto-saved {format(lastAutoSave, 'h:mm a')}</span>
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
      <div className="px-6 py-4 border-t border-border flex items-center justify-between">
        <Button 
          variant="ghost" 
          onClick={handleDelete}
          disabled={isDeleting}
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          {isDeleting ? "Deleting..." : "Delete"}
        </Button>
        
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            onClick={handleSaveAndClose}
            className="text-muted-foreground"
          >
            <Save className="h-4 w-4 mr-2" />
            Save Draft
          </Button>
          <Button 
            onClick={handlePublish} 
            disabled={isPublishing}
            className="bg-foreground text-background hover:bg-foreground/90"
          >
            <Send className="h-4 w-4 mr-2" />
            {isPublishing ? "Publishing..." : "Publish"}
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

export default JournalEditorContainer;
