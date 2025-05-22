
import React, { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { JournalEntry as JournalEntryType } from '@/types';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { useJournal } from '@/contexts/JournalContext';
import JournalEditor from './JournalEditor';
import { useToast } from '@/hooks/use-toast';
import CommentSection from './CommentSection';
import SpotifyPlayer from './spotify/SpotifyPlayer';
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
  
  if (isEditing) {
    return <JournalEditor entry={entry} onSave={() => setIsEditing(false)} />;
  }

  return (
    <Card className={cn("journal-card", className)}>
      <EntryHeader 
        date={entryDateTime}
        formattedDate={formattedDate}
        formattedTime={formattedTime}
        updatedAt={entry.updatedAt}
        weather={entry.weather}
      />
      
      <EntryMood mood={entry.mood} />
      
      {/* Spotify Track Section */}
      {entry.track && (
        <div className="mb-6">
          <SpotifyPlayer track={entry.track} className="mb-2" />
        </div>
      )}
      
      <EntryContent content={entry.content} />
      
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

          <EntryActions
            onEdit={() => setIsEditing(true)}
            onDelete={handleDelete}
          />
        </>
      )}
    </Card>
  );
};

export default JournalEntryView;
