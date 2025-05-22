import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import ReflectionQuestion from './reflection/ReflectionQuestion';
import ReflectionEditor from './reflection/ReflectionEditor';
import ReflectionDisplay from './reflection/ReflectionDisplay';
import ReflectionTrigger from './reflection/ReflectionTrigger';
import { useQueryClient } from '@tanstack/react-query';
import { useSupabaseRPC } from '@/services/api';

interface ReflectionModuleProps {
  entryId: string;
  entryContent: string;
  entryMood: string;
  reflectionQuestion: string | null;
  reflectionAnswer: string | null;
  onReflectionUpdate: () => Promise<void>;
  isTrackPlaying?: boolean;
  hasTrack?: boolean;
}

const ReflectionModule: React.FC<ReflectionModuleProps> = ({
  entryId,
  entryContent,
  entryMood,
  reflectionQuestion,
  reflectionAnswer,
  onReflectionUpdate,
  isTrackPlaying = false,
  hasTrack = false
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const queryClient = useQueryClient();
  const supabaseRPC = useSupabaseRPC();
  
  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    
    try {
      const { error, data } = await supabaseRPC('generate-reflection', {
        entry_content: entryContent,
        mood: entryMood
      });
      
      if (error) throw new Error(error.message);
      
      // Update the entry with the generated reflection question
      await updateReflection(data.question, null);
      
    } catch (err: any) {
      console.error('Error generating reflection:', err);
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };
  
  const updateReflection = async (question: string | null, answer: string | null) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabaseRPC('update-reflection', {
        entry_id: entryId,
        question,
        answer
      });
      
      if (error) throw new Error(error.message);
      
      // Invalidate and refetch queries to update the UI
      await onReflectionUpdate();
      
      // Exit editing mode if applicable
      setIsEditing(false);
      
    } catch (err: any) {
      console.error('Error updating reflection:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSubmitAnswer = async (answer: string) => {
    await updateReflection(reflectionQuestion, answer);
  };
  
  const handleDeleteReflection = async () => {
    await updateReflection(null, null);
  };
  
  // If we have a question but no answer, or we're in editing mode, show the editor
  if ((reflectionQuestion && !reflectionAnswer) || isEditing) {
    return (
      <Card className="mb-6">
        <CardContent className="pt-6">
          <ReflectionQuestion question={reflectionQuestion || ''} />
          <ReflectionEditor 
            initialValue={reflectionAnswer || ''} 
            onSubmit={handleSubmitAnswer}
            onCancel={() => setIsEditing(false)}
            isLoading={isLoading}
          />
        </CardContent>
      </Card>
    );
  }
  
  // If we have both question and answer, display them
  if (reflectionQuestion && reflectionAnswer) {
    return (
      <Card className="mb-6">
        <CardContent className="pt-6">
          <ReflectionQuestion question={reflectionQuestion} />
          <ReflectionDisplay 
            answer={reflectionAnswer} 
            onEdit={() => setIsEditing(true)} 
            onDelete={handleDeleteReflection}
            isLoading={isLoading}
            isTrackPlaying={isTrackPlaying}
            hasTrack={hasTrack}
          />
        </CardContent>
      </Card>
    );
  }
  
  // Otherwise, show the trigger to generate a reflection
  return (
    <ReflectionTrigger 
      onClick={handleGenerate} 
      isLoading={isGenerating} 
      error={error}
    />
  );
};

export default ReflectionModule;
