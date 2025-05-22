
import React, { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { JournalEntry as JournalEntryType } from '@/types';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { useJournal } from '@/contexts/JournalContext';
import JournalEditor from './JournalEditor';
import { useToast } from '@/hooks/use-toast';
import CommentSection from './CommentSection';
import SpotifyPlayerSDK from './spotify/SpotifyPlayerSDK';
import ReflectionModule from './journal/ReflectionModule';
import EntryHeader from './journal/EntryHeader';
import EntryMood from './journal/EntryMood';
import EntryContent from './journal/EntryContent';
import EntryActions from './journal/EntryActions';

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
  const [isContentBlurred, setIsContentBlurred] = useState(!!entry.track);
  const { deleteEntry, addCommentToEntry, deleteCommentFromEntry, updateEntry } = useJournal();
  const { toast } = useToast();
  
  // Parse ISO date string properly to display in local timezone
  const parseDate = (dateValue: string | number) => {
    if (!dateValue) return new Date();
    
    // Handle both string and number timestamp values
    if (typeof dateValue === 'number') {
      return new Date(dateValue);
    }
    
    // Handle string formats (ISO or date-only)
    if (typeof dateValue === 'string') {
      return dateValue.includes('T') 
        ? parseISO(dateValue) 
        : parseISO(`${dateValue}T00:00:00.000Z`);
    }
    
    return new Date(dateValue);
  };
  
  // Use the actual entry timestamp for the date display when available
  const entryDateTime = entry.timestamp 
    ? parseDate(entry.timestamp)
    : parseDate(entry.date);
  
  // Format the date consistently as full weekday, month day, year - matching the editor
  const formattedDate = format(entryDateTime, 'EEEE, MMMM d, yyyy');
  
  // Format time from timestamp if available
  const formattedTime = entry.timestamp 
    ? format(parseDate(entry.timestamp), 'h:mm a')
    : '';
  
  const handleDelete = async () => {
    await deleteEntry(entry.id);
    toast({
      title: "Entry deleted",
      description: "Your journal entry has been permanently deleted."
    });
  };
  
  const handleAddComment = async (content: string) => {
    await addCommentToEntry(entry.id, content);
  };
  
  const handleDeleteComment = async (commentId: string) => {
    await deleteCommentFromEntry(entry.id, commentId);
    toast({
      title: "Note deleted",
      description: "Your note has been permanently deleted."
    });
  };

  const handleReflectionUpdate = async () => {
    // Refresh the entry data after reflection update
    const updatedEntry = { ...entry };
    await updateEntry(updatedEntry);
  };
  
  const handlePlaybackStateChange = (isPlaying: boolean) => {
    console.log("Spotify playback state changed:", isPlaying);
    if (isPlaying) {
      setIsContentBlurred(false);
    }
  };
  
  if (isEditing) {
    return <JournalEditor entry={entry} onSave={() => setIsEditing(false)} />;
  }

  return (
    <Card className={cn("journal-card", className)}>
      <div className="p-4">
        <div className="flex items-start justify-between mb-4">
          <EntryHeader 
            date={entryDateTime}
            formattedDate={formattedDate}
            formattedTime={formattedTime}
            updatedAt={entry.updatedAt}
            weather={entry.weather}
          />
          {!isPreview && (
            <EntryActions
              onEdit={() => setIsEditing(true)}
              onDelete={handleDelete}
            />
          )}
        </div>
        
        <EntryMood mood={entry.mood} />
        
        {/* Spotify Track Section */}
        {entry.track && (
          <div className="mb-6">
            <SpotifyPlayerSDK 
              track={entry.track} 
              onPlaybackStateChange={handlePlaybackStateChange}
              className="mb-2"
            />
          </div>
        )}
        
        <EntryContent 
          content={entry.content} 
          isBlurred={isContentBlurred}
          onPlayRequest={() => {
            // This will trigger the Spotify UI to ask the user to play
            const spotifySection = document.querySelector('.spotify-player button');
            if (spotifySection) {
              (spotifySection as HTMLButtonElement).click();
            }
          }}
        />
        
        {!isPreview && (
          <>
            {/* Reflection Module */}
            <ReflectionModule
              entryId={entry.id}
              entryContent={entry.content}
              entryMood={entry.mood}
              reflectionQuestion={entry.reflectionQuestion || null}
              reflectionAnswer={entry.reflectionAnswer || null}
              onReflectionUpdate={handleReflectionUpdate}
            />

            <div className="border-t border-border my-4 pt-4">
              <CommentSection
                comments={entry.comments || []}
                onAddComment={handleAddComment}
                onDeleteComment={handleDeleteComment}
              />
            </div>
          </>
        )}
      </div>
    </Card>
  );
};

export default JournalEntryView;
