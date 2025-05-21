
import React, { useState } from 'react';
import { JournalEntry as JournalEntryType } from '@/types';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { useJournal } from '@/contexts/JournalContext';
import JournalEditor from './JournalEditor';
import CommentSection from './CommentSection';
import SpotifyPlayer from './spotify/SpotifyPlayer';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Import our new components
import EntryHeader from './journal/EntryHeader';
import MoodDisplay from './journal/MoodDisplay';
import EntryContent from './journal/EntryContent';
import EntryActions from './journal/EntryActions';
import ReflectionSection from './journal/ReflectionSection';

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
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);
  const [aiPrompt, setAiPrompt] = useState<string | null>(entry.ai_prompt);
  const [aiResponse, setAiResponse] = useState<string | null>(entry.ai_response);
  
  if (isEditing) {
    return <JournalEditor entry={entry} onSave={() => setIsEditing(false)} />;
  }
  
  // Function to generate an AI prompt for this entry
  const generateAIPrompt = async () => {
    if (isGeneratingPrompt) return;
    
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
  
  // Function to save the AI response to the entry
  const handleResponseChange = (response: string) => {
    setAiResponse(response);
  };
  
  const handleSaveResponse = async () => {
    try {
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
  
  const handleCancelResponse = () => {
    setAiResponse(entry.ai_response); // Reset to the original saved response
  };
  
  const handleDeleteResponse = async () => {
    try {
      await updateEntry({
        ...entry,
        ai_response: null
      });
      
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
  
  return (
    <Card className={cn("journal-card", className)}>
      <EntryHeader 
        timestamp={entry.timestamp}
        date={entry.date}
        updatedAt={entry.updatedAt}
        weather={entry.weather}
      />
      
      <MoodDisplay mood={entry.mood} />
      
      {/* Spotify Track Section */}
      {entry.track && (
        <div className="mb-6">
          <SpotifyPlayer track={entry.track} className="mb-2" />
        </div>
      )}
      
      <EntryContent content={entry.content} />
      
      <ReflectionSection
        aiPrompt={aiPrompt}
        aiResponse={aiResponse}
        isGeneratingPrompt={isGeneratingPrompt}
        onGeneratePrompt={generateAIPrompt}
        onRegeneratePrompt={handleRegeneratePrompt}
        onResponseChange={handleResponseChange}
        onSaveResponse={handleSaveResponse}
        onCancelResponse={handleCancelResponse}
        onDeleteResponse={handleDeleteResponse}
        isPreview={isPreview}
      />
      
      {!isPreview && (
        <>
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
