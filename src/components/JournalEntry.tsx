
import React, { useState } from 'react';
import { format } from 'date-fns';
import { JournalEntry as JournalEntryType } from '@/types';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import WeatherDisplay from './WeatherDisplay';
import MoodSelector from './MoodSelector';
import { useJournal } from '@/contexts/JournalContext';
import JournalEditor from './JournalEditor';
import { Pencil, Trash } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface JournalEntryProps {
  entry: JournalEntryType;
  className?: string;
  isPreview?: boolean;
}

const JournalEntryView: React.FC<JournalEntryProps> = ({ 
  entry, 
  className,
  isPreview = false
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const { deleteEntry } = useJournal();
  const { toast } = useToast();
  
  const formattedDate = format(new Date(entry.date), 'EEEE, MMMM d, yyyy');
  const formattedTime = entry.timestamp 
    ? format(new Date(entry.timestamp), 'h:mm a')
    : '';
  
  const handleDelete = () => {
    // In a real app, we would show a confirmation dialog
    deleteEntry(entry.id);
    toast({
      title: "Entry deleted",
      description: "Your journal entry has been permanently deleted."
    });
  };
  
  if (isEditing) {
    return <JournalEditor entry={entry} onSave={() => setIsEditing(false)} />;
  }
  
  const moodEmoji = {
    'happy': '😄',
    'content': '😊',
    'neutral': '😐',
    'sad': '😔',
    'anxious': '😰',
    'angry': '😠',
    'emotional': '🥹',
    'in-love': '😍',
    'excited': '🤩',
    'tired': '😴'
  }[entry.mood] || '😐';

  return (
    <Card className={cn("journal-card", className)}>
      <div className="mb-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h3 className="text-xl font-semibold">{formattedDate}</h3>
          <p className="text-sm text-muted-foreground">{formattedTime}</p>
          {entry.updatedAt && (
            <p className="text-xs text-muted-foreground">
              Updated: {format(new Date(entry.updatedAt), 'MMM d, yyyy h:mm a')}
            </p>
          )}
        </div>
        {entry.weather && (
          <WeatherDisplay weatherData={entry.weather} isLoading={false} />
        )}
      </div>
      
      <div className="mb-4 flex items-center gap-2">
        <span className="text-2xl">{moodEmoji}</span>
        <span className="text-sm text-muted-foreground capitalize">{entry.mood.replace('-', ' ')}</span>
      </div>
      
      {entry.track && (
        <div className="mb-4 p-2 bg-muted rounded-md flex items-center gap-3">
          <img 
            src={entry.track.albumArt} 
            alt={`${entry.track.album} cover`} 
            className="h-12 w-12 rounded"
          />
          <div className="flex-1">
            <p className="text-sm font-medium">{entry.track.name}</p>
            <p className="text-xs text-muted-foreground">{entry.track.artist}</p>
          </div>
        </div>
      )}
      
      <div className="mb-6">
        <div className="whitespace-pre-wrap text-left">{entry.content}</div>
      </div>
      
      {!isPreview && (
        <div className="flex justify-end gap-2">
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => setIsEditing(true)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button 
            variant="outline" 
            size="icon" 
            onClick={handleDelete}
            className="text-destructive hover:text-destructive"
          >
            <Trash className="h-4 w-4" />
          </Button>
        </div>
      )}
    </Card>
  );
};

export default JournalEntryView;
