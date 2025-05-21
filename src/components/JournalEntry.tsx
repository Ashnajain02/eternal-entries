
import React, { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { JournalEntry as JournalEntryType } from '@/types';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import WeatherDisplay from './WeatherDisplay';
import { useJournal } from '@/contexts/JournalContext';
import JournalEditor from './JournalEditor';
import { Pencil, Trash, MessageSquare, Loader2 } from 'lucide-react';
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
import SpotifyTrackDisplay from './spotify/SpotifyTrackDisplay';
import SpotifyPlayer from './spotify/SpotifyPlayer';
import AIPrompt from './journal/AIPrompt';
import { supabase } from '@/integrations/supabase/client';

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
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);
  const [aiPrompt, setAiPrompt] = useState<string | null>(entry.ai_prompt);
  const [aiResponse, setAiResponse] = useState<string | null>(entry.ai_response);
  
  console.log("Rendering entry with track:", entry.track);
  console.log("Current AI prompt:", aiPrompt, "Current AI response:", aiResponse);
  
  // Sync state with props when they change
  useEffect(() => {
    setAiPrompt(entry.ai_prompt);
    setAiResponse(entry.ai_response);
  }, [entry.ai_prompt, entry.ai_response]);
  
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
  
  // Function to generate an AI prompt for this entry
  const generateAIPrompt = async () => {
    if (isGeneratingPrompt || entry.ai_prompt) return;
    
    setIsGeneratingPrompt(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-prompt', {
        body: { journalContent: entry.content }
      });
      
      if (error) throw error;
      
      if (data && data.prompt) {
        setAiPrompt(data.prompt);
        
        // Update the entry in the database with the new prompt
        await updateEntry({
          ...entry,
          ai_prompt: data.prompt
        });
        
        toast({
          title: "Reflection prompt generated",
          description: "A reflection prompt has been created based on your journal entry."
        });
      }
    } catch (error) {
      console.error('Error generating AI prompt:', error);
      toast({
        title: "Error generating prompt",
        description: "Could not generate a reflection prompt. Please try again later.",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingPrompt(false);
    }
  };
  
  // Function to save the AI response to the entry
  const handleResponseChange = async (response: string) => {
    setAiResponse(response);
    
    try {
      await updateEntry({
        ...entry,
        ai_response: response
      });
    } catch (error) {
      console.error('Error saving AI response:', error);
    }
  };
  
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
      
      {/* Spotify Track Section */}
      {entry.track && (
        <div className="mb-6">
          <SpotifyPlayer track={entry.track} className="mb-2" />
        </div>
      )}
      
      <div className="mb-6">
        <div className="whitespace-pre-wrap text-left">{entry.content}</div>
      </div>
      
      {/* AI Prompt Section */}
      {aiPrompt ? (
        <div className="mb-6">
          <AIPrompt
            prompt={aiPrompt}
            response={aiResponse}
            onResponseChange={handleResponseChange}
            isReadOnly={isPreview}
          />
        </div>
      ) : !isPreview && (
        <div className="mb-6">
          <Button
            variant="outline"
            size="sm"
            onClick={generateAIPrompt}
            disabled={isGeneratingPrompt}
            className="flex items-center gap-2"
          >
            {isGeneratingPrompt ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Generating reflection prompt...</span>
              </>
            ) : (
              <>
                <MessageSquare className="h-4 w-4" />
                <span>Generate reflection prompt</span>
              </>
            )}
          </Button>
        </div>
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
