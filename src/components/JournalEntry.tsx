
import React, { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { JournalEntry as JournalEntryType } from '@/types';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import WeatherDisplay from './WeatherDisplay';
import { useJournal } from '@/contexts/JournalContext';
import JournalEditor from './JournalEditor';
import { Pencil, Trash } from 'lucide-react';
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
import CommentSection from './CommentSection';
import AiReflection from './journal/AiReflection';

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
  const { deleteEntry, addCommentToEntry, deleteCommentFromEntry } = useJournal();
  const { toast } = useToast();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
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
              Updated: {format(parseDate(entry.updatedAt), 'MMM d, yyyy h:mm a')}
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
      
      <div className="mb-6">
        <div className="whitespace-pre-wrap text-left">{entry.content}</div>
      </div>
      
      {!isPreview && !isEditing && (
        <AiReflection entryContent={entry.content} className="mb-6" />
      )}
      
      {!isPreview && (
        <>
          <div className="border-t border-border my-4 pt-4">
            <CommentSection
              comments={entry.comments || []}
              onAddComment={handleAddComment}
              onDeleteComment={handleDeleteComment}
            />
          </div>

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
        </>
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
