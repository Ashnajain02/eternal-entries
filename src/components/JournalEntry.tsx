import React, { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { JournalEntry as JournalEntryType } from '@/types';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import WeatherDisplay from './WeatherDisplay';
import { useJournal } from '@/contexts/JournalContext';
import JournalEditor from './JournalEditor';
import { Pencil, Trash, MessageSquare, Loader2, RefreshCcw } from 'lucide-react';
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

  // Make sure aiPrompt and aiResponse stay in sync with props
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
    if (isGeneratingPrompt) return;
    
    setIsGeneratingPrompt(true);
    
    try {
      console.log("Calling generate-prompt function with content length:", entry.content.length);
      const { data, error } = await supabase.functions.invoke('generate-prompt', {
        body: { journalContent: entry.content }
      });
      
      if (error) {
        console.error("Supabase function error:", error);
        throw error;
      }
      
      console.log("Response from generate-prompt function:", data);
      
      if (data && data.prompt) {
        setAiPrompt(data.prompt);
        
        // Update the entry in the database with the new prompt
        await updateEntry({
          ...entry,
          ai_prompt: data.prompt
        });
        
        toast({
          title: "New reflection question created",
          description: "We've added a fresh reflection question for your entry."
        });
      }
    } catch (error) {
      console.error('Error generating AI prompt:', error);
      toast({
        title: "Couldn't create reflection question",
        description: "We ran into an issue while creating your reflection question. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingPrompt(false);
    }
  };
  
  // Function to regenerate a new prompt to replace the current one
  const handleRegeneratePrompt = async () => {
    if (isGeneratingPrompt) return;
    setIsGeneratingPrompt(true);
    
    try {
      console.log("Regenerating prompt with content length:", entry.content.length);
      const { data, error } = await supabase.functions.invoke('generate-prompt', {
        body: { journalContent: entry.content }
      });
      
      if (error) {
        console.error("Supabase function error:", error);
        throw error;
      }
      
      console.log("Response from regenerate-prompt:", data);
      
      if (data && data.prompt) {
        setAiPrompt(data.prompt);
        
        // Update the entry in the database with the new prompt
        await updateEntry({
          ...entry,
          ai_prompt: data.prompt
        });
        
        toast({
          title: "New question generated",
          description: "We've refreshed your reflection question."
        });
      }
    } catch (error) {
      console.error('Error regenerating AI prompt:', error);
      toast({
        title: "Couldn't create new question",
        description: "We couldn't generate a new question. Please try again later.",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingPrompt(false);
    }
  };
  
  // Function to handle response change
  const handleResponseChange = (response: string) => {
    setAiResponse(response);
  };
  
  // Function to save the response
  const handleSaveResponse = async () => {
    try {
      console.log("Saving AI response:", aiResponse);
      await updateEntry({
        ...entry,
        ai_response: aiResponse
      });
      
      toast({
        title: "Thoughts saved",
        description: "Your reflection has been saved to your journal."
      });
    } catch (error) {
      console.error('Error saving AI response:', error);
      toast({
        title: "Couldn't save your thoughts",
        description: "There was a problem saving your reflection. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  // Function to cancel the response input
  const handleCancelResponse = () => {
    setAiResponse(entry.ai_response); // Reset to the original saved response
  };
  
  // Function to delete the response
  const handleDeleteResponse = async () => {
    try {
      await updateEntry({
        ...entry,
        ai_prompt: null,
        ai_response: null
      });
      
      setAiPrompt(null);
      setAiResponse(null);
      toast({
        title: "Reflection deleted",
        description: "Your reflection has been removed from this entry."
      });
    } catch (error) {
      console.error('Error deleting response:', error);
      toast({
        title: "Couldn't delete reflection",
        description: "There was a problem removing your reflection. Please try again.",
        variant: "destructive"
      });
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
            onSaveResponse={handleSaveResponse}
            onCancelResponse={handleCancelResponse}
            onDeleteResponse={handleDeleteResponse}
            onRegeneratePrompt={!isPreview ? handleRegeneratePrompt : undefined}
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
                <span>Creating a reflection question...</span>
              </>
            ) : (
              <>
                <MessageSquare className="h-4 w-4" />
                <span>Add a reflection question</span>
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
