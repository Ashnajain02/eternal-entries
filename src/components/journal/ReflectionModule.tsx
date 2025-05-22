import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import ReflectionQuestion from './reflection/ReflectionQuestion';
import ReflectionEditor from './reflection/ReflectionEditor';
import ReflectionDisplay from './reflection/ReflectionDisplay';
import ReflectionTrigger from './reflection/ReflectionTrigger';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { generateReflectionQuestion } from '@/services/api';

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
  const [answer, setAnswer] = useState(reflectionAnswer || '');
  
  const queryClient = useQueryClient();
  
  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    
    try {
      // Use the API function to generate a reflection question
      const question = await generateReflectionQuestion(entryContent, entryMood);
      
      // Update the entry with the generated reflection question
      await updateReflection(question, null);
      
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
      const { data, error } = await supabase
        .from('journal_entries')
        .update({
          reflection_question: question,
          reflection_answer: answer
        })
        .eq('id', entryId);
      
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

  const handleEditCancel = () => {
    setIsEditing(false);
  };
  
  // If we have a question but no answer, or we're in editing mode, show the editor
  if ((reflectionQuestion && !reflectionAnswer) || isEditing) {
    return (
      <Card className="mb-6">
        <CardContent className="pt-6">
          <ReflectionQuestion 
            question={reflectionQuestion || ''} 
            isEditing={true}
            isLoading={isLoading}
            onRefresh={handleGenerate}
            onClose={() => setIsEditing(false)}
          />
          <ReflectionEditor 
            answer={answer} 
            onChange={setAnswer}
            onSave={() => handleSubmitAnswer(answer)}
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
          <ReflectionQuestion 
            question={reflectionQuestion}
            isEditing={false}
            isLoading={false}
            onRefresh={() => {}}
            onClose={() => {}}
          />
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
    />
  );
};

export default ReflectionModule;
