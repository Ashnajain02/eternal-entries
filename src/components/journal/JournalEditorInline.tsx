import React, { useState } from 'react';
import { JournalEntry } from '@/types';
import { useJournal } from '@/contexts/JournalContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import SpotifySection from './SpotifySection';
import { useWeatherData } from '@/hooks/useWeatherData';
import { useSpotifyConnection } from '@/hooks/useSpotifyConnection';
import MoodSelector from '@/components/MoodSelector';
import WeatherDisplay from '@/components/WeatherDisplay';
import RichTextEditor from './RichTextEditor';
import { motion } from 'framer-motion';
import { X, Check } from 'lucide-react';

interface JournalEditorInlineProps {
  entry: JournalEntry;
  onSave: () => void;
  onCancel: () => void;
}

const JournalEditorInline: React.FC<JournalEditorInlineProps> = ({
  entry: initialEntry,
  onSave,
  onCancel
}) => {
  const { updateEntry } = useJournal();
  const { toast } = useToast();
  
  const { 
    weatherData, 
    isLoadingWeather, 
    locationError, 
    handleGetWeather 
  } = useWeatherData(initialEntry.weather);
  
  const { spotifyConnected } = useSpotifyConnection();
  
  const [content, setContent] = useState(initialEntry.content || '');
  const [selectedMood, setSelectedMood] = useState(initialEntry.mood || 'neutral');
  const [selectedTrack, setSelectedTrack] = useState(initialEntry.track);
  const [isSaving, setIsSaving] = useState(false);

  const entryDate = initialEntry.date
    ? new Date(initialEntry.date + 'T00:00:00')
    : new Date();
  
  const formattedDate = format(entryDate, 'EEEE, MMMM d');
  const formattedYear = format(entryDate, 'yyyy');

  const handleSave = async () => {
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
        ...initialEntry,
        content,
        mood: selectedMood,
        weather: weatherData || initialEntry.weather,
        track: selectedTrack,
      };

      await updateEntry(updatedEntry);
      toast({
        title: "Entry updated",
        description: "Your journal entry has been saved."
      });
      onSave();
    } catch (error) {
      console.error('Error saving journal entry:', error);
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleCancel = () => {
    const textContent = content.replace(/<[^>]*>/g, '').trim();
    const originalContent = initialEntry.content.replace(/<[^>]*>/g, '').trim();
    
    if (textContent !== originalContent) {
      const confirmCancel = window.confirm("You have unsaved changes. Discard them?");
      if (!confirmCancel) return;
    }
    onCancel();
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
          <span className="text-sm text-muted-foreground">{formattedYear}</span>
        </div>
        <div className="flex items-center gap-3">
          <WeatherDisplay 
            weatherData={weatherData} 
            isLoading={isLoadingWeather} 
            onRefresh={handleGetWeather} 
          />
        </div>
      </div>

      {/* Spotify */}
      <div className="px-6 py-4 border-b border-border bg-accent/20">
        <SpotifySection
          selectedTrack={selectedTrack}
          onTrackSelect={setSelectedTrack}
          spotifyConnected={spotifyConnected}
          onSpotifyConnect={() => {}}
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
          {isSaving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </motion.div>
  );
};

export default JournalEditorInline;
