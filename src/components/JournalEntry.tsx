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
import { Pencil, Trash, Play, Music } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  const [isSpotifyExpanded, setIsSpotifyExpanded] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  // Parse the date to ensure proper local timezone handling
  let entryDate;
  try {
    entryDate = new Date(entry.date);
    
    // If the date is invalid, use current date
    if (isNaN(entryDate.getTime())) {
      entryDate = new Date();
    }
  } catch (error) {
    // Fallback to current date
    entryDate = new Date();
  }
  
  const formattedDate = format(entryDate, 'EEEE, MMMM d, yyyy');
  
  // Format time from timestamp if available
  const formattedTime = entry.timestamp 
    ? format(new Date(entry.timestamp), 'h:mm a')
    : '';
  
  const handleDelete = () => {
    // Now we just open the confirmation dialog
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    await deleteEntry(entry.id);
    toast({
      title: "Entry deleted",
      description: "Your journal entry has been permanently deleted."
    });
    setIsDeleteDialogOpen(false);
  };

  const openSpotify = () => {
    if (entry.track?.uri) {
      window.open(`https://open.spotify.com/track/${entry.track.uri.split(':')[2]}`, '_blank');
    }
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
        <div className="mb-4">
          <div className="p-2 bg-muted rounded-md">
            <div className="flex items-center gap-3">
              <img 
                src={entry.track.albumArt} 
                alt={`${entry.track.album} cover`} 
                className="h-12 w-12 rounded"
              />
              <div className="flex-1">
                <p className="text-sm font-medium">{entry.track.name}</p>
                <p className="text-xs text-muted-foreground">{entry.track.artist}</p>
              </div>
              <Button 
                size="icon" 
                variant="ghost" 
                className="text-green-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-950" 
                onClick={openSpotify}
                title="Play on Spotify"
              >
                <Play className="h-4 w-4 fill-current" />
              </Button>
            </div>
            
            {isSpotifyExpanded && (
              <div className="mt-2 pt-2 border-t">
                <iframe
                  title={`Spotify player for ${entry.track.name}`}
                  src={`https://open.spotify.com/embed/track/${entry.track.uri.split(':')[2]}`}
                  width="100%"
                  height="80"
                  frameBorder="0"
                  allow="encrypted-media"
                  loading="lazy"
                  className="rounded"
                ></iframe>
              </div>
            )}
            
            <div className="text-center mt-1">
              <Button 
                variant="link" 
                size="sm" 
                className="text-xs text-muted-foreground h-auto py-0" 
                onClick={() => setIsSpotifyExpanded(prev => !prev)}
              >
                {isSpotifyExpanded ? 'Hide player' : 'Show player'}
              </Button>
            </div>
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

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your journal entry.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default JournalEntryView;
