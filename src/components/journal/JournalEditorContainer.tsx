import React, { useState, useEffect, useCallback } from 'react';
import { JournalEntry } from '@/types';
import { getPlainTextContent } from '@/utils/journalEntryMapper';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import MusicSection from '@/components/music/MusicSection';
import { useWeatherData } from '@/hooks/useWeatherData';
import MoodSelector from '@/components/MoodSelector';
import WeatherDisplay from '@/components/WeatherDisplay';
import RichTextEditor from './RichTextEditor';
import EntryPageLayout from '@/components/shared/EntryPageLayout';
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

  const [content, setContent] = useState(initialEntry?.content || '');
  const [selectedMood, setSelectedMood] = useState(initialEntry?.mood || 'neutral');
  const [selectedTrack, setSelectedTrack] = useState(initialEntry?.track);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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

  useEffect(() => {
    if (initialEntry.id && initialEntry.id !== entry.id) {
      setEntry(prev => ({ ...prev, id: initialEntry.id }));
    }
  }, [initialEntry.id]);

  const getCurrentEntry = useCallback((): JournalEntry => {
    return {
      ...entry,
      content,
      mood: selectedMood,
      track: selectedTrack,
      weather: weatherData || undefined,
    };
  }, [entry, content, selectedMood, selectedTrack, weatherData]);

  useEffect(() => {
    const currentEntry = getCurrentEntry();
    onAutoSave(currentEntry);
  }, [content, selectedMood, selectedTrack, weatherData]);

  const handlePublish = async () => {
    if (!getPlainTextContent(content)) {
      toast({
        title: "Cannot publish empty entry",
        description: "Please write something in your journal before publishing.",
        variant: "destructive"
      });
      return;
    }
    setIsPublishing(true);
    try { onPublish(); } finally { setIsPublishing(false); }
  };

  const handleDelete = async () => {
    const hasContent = getPlainTextContent(content) || selectedTrack || selectedMood !== 'neutral';
    if (hasContent) {
      const confirmDelete = window.confirm("Are you sure you want to delete this entry? This cannot be undone.");
      if (!confirmDelete) return;
    }
    setIsDeleting(true);
    try { onDelete(); } finally { setIsDeleting(false); }
  };

  const handleSaveAndClose = () => {
    const hasContent = getPlainTextContent(content) || selectedTrack || selectedMood !== 'neutral';
    if (hasContent) {
      toast({ title: "Draft saved", description: "Your entry has been saved as a draft." });
    }
    onClose();
  };

  const autoSaveText = lastAutoSave
    ? <> &middot; Auto-saved {format(lastAutoSave, 'h:mm a')}</>
    : null;

  return (
    <EntryPageLayout
      date={entry.date}
      timestamp={entry.timestamp}
      mood={selectedMood}
      weather={weatherData || undefined}
      metadataExtra={autoSaveText}
      actions={
        <div className="flex items-center gap-3">
          <WeatherDisplay
            weatherData={weatherData}
            isLoading={isLoadingWeather}
            onRefresh={handleGetWeather}
          />
        </div>
      }
    >
      {locationError && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>
            {locationError}{' '}
            <Button variant="link" className="p-0 h-auto text-destructive" onClick={handleGetWeather}>
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Music */}
      <div className="mb-6">
        <MusicSection
          selectedTrack={selectedTrack}
          onTrackSelect={setSelectedTrack}
        />
      </div>

      {/* Mood */}
      <div className="mb-6">
        <MoodSelector selectedMood={selectedMood} onChange={setSelectedMood} />
      </div>

      {/* Content - Rich Text Editor */}
      <div className="mb-8">
        <RichTextEditor
          content={content}
          onChange={setContent}
          placeholder="What's on your mind today..."
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-6">
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
    </EntryPageLayout>
  );
};

export default JournalEditorContainer;
