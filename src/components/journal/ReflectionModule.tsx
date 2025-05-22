
import React, { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { generateReflectionQuestion } from '@/services/api';
import ReflectionQuestion from './reflection/ReflectionQuestion';
import ReflectionEditor from './reflection/ReflectionEditor';
import ReflectionDisplay from './reflection/ReflectionDisplay';
import ReflectionTrigger from './reflection/ReflectionTrigger';

interface ReflectionModuleProps {
  entryId: string;
  entryContent: string;
  entryMood: string;
  reflectionQuestion: string | null;
  reflectionAnswer: string | null;
  onReflectionUpdate: () => void;
}

const ReflectionModule: React.FC<ReflectionModuleProps> = ({
  entryId,
  entryContent,
  entryMood,
  reflectionQuestion,
  reflectionAnswer,
  onReflectionUpdate
}) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [question, setQuestion] = useState(reflectionQuestion || '');
  const [answer, setAnswer] = useState(reflectionAnswer || '');
  const [isEditing, setIsEditing] = useState(false);
  const [showModule, setShowModule] = useState(!!reflectionQuestion);

  const generateQuestion = async () => {
    setIsLoading(true);
    try {
      // Use the API service to call the Supabase function
      const generatedQuestion = await generateReflectionQuestion(entryContent, entryMood);
      
      setQuestion(generatedQuestion);
      setShowModule(true);
      setIsEditing(true);
    } catch (error) {
      console.error('Error generating reflection question:', error);
      toast({
        title: 'Error generating reflection',
        description: 'Could not generate a reflection question. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveReflection = async () => {
    if (!question || !answer.trim()) {
      toast({
        title: 'Cannot save empty reflection',
        description: 'Please write your reflection before saving.',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('journal_entries')
        .update({
          reflection_question: question,
          reflection_answer: answer.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', entryId);

      if (error) throw error;

      setIsEditing(false);
      onReflectionUpdate();
      
      toast({
        title: 'Reflection saved',
        description: 'Your reflection has been saved successfully.'
      });
    } catch (error) {
      console.error('Error saving reflection:', error);
      toast({
        title: 'Error saving reflection',
        description: 'Could not save your reflection. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const deleteReflection = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('journal_entries')
        .update({
          reflection_question: null,
          reflection_answer: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', entryId);

      if (error) throw error;
      
      setQuestion('');
      setAnswer('');
      setShowModule(false);
      onReflectionUpdate();
      
      toast({
        title: 'Reflection deleted',
        description: 'Your reflection has been deleted successfully.'
      });
    } catch (error) {
      console.error('Error deleting reflection:', error);
      toast({
        title: 'Error deleting reflection',
        description: 'Could not delete your reflection. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (isEditing && answer.trim()) {
      const confirmed = window.confirm('You have an unsaved reflection. Are you sure you want to discard it?');
      if (!confirmed) return;
    }
    
    if (!reflectionQuestion && !reflectionAnswer) {
      // If there's no saved reflection, hide the module completely
      setShowModule(false);
    } else {
      // If there's a saved reflection, return to view mode
      setIsEditing(false);
      setQuestion(reflectionQuestion || '');
      setAnswer(reflectionAnswer || '');
    }
  };

  if (!showModule) {
    return <ReflectionTrigger onClick={generateQuestion} isLoading={isLoading} />;
  }

  return (
    <div className="border border-border rounded-md p-4 mt-4 bg-muted/20">
      <div className="flex flex-col space-y-4">
        <ReflectionQuestion 
          question={question}
          isEditing={isEditing}
          isLoading={isLoading}
          onRefresh={generateQuestion}
          onClose={handleClose}
        />
        
        {isEditing ? (
          <ReflectionEditor
            answer={answer}
            isLoading={isLoading}
            onChange={setAnswer}
            onSave={saveReflection}
          />
        ) : (
          <ReflectionDisplay
            answer={answer}
            onEdit={() => setIsEditing(true)}
            onDelete={deleteReflection}
            isLoading={isLoading}
          />
        )}
      </div>
    </div>
  );
};

export default ReflectionModule;
