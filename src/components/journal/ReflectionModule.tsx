import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Sparkles, RefreshCcw, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { generateReflectionQuestion } from '@/services/api';

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
    return (
      <Button
        onClick={generateQuestion}
        disabled={isLoading}
        className="w-full mt-4"
        variant="outline"
      >
        {isLoading ? (
          <>Generating... <RefreshCcw className="animate-spin ml-2 h-4 w-4" /></>
        ) : (
          <>Generate Reflection Question <Sparkles className="ml-2 h-4 w-4" /></>
        )}
      </Button>
    );
  }

  return (
    <div className="border border-border rounded-md p-4 mt-4 bg-muted/20">
      <div className="flex flex-col space-y-4">
        <div className="flex justify-between items-start">
          <div className="flex-1 font-medium text-left">
            {question}
          </div>
          <div className="flex space-x-2 ml-2">
            {isEditing && (
              <Button 
                size="icon" 
                variant="ghost" 
                onClick={generateQuestion} 
                disabled={isLoading}
              >
                <RefreshCcw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            )}
            <Button size="icon" variant="ghost" onClick={handleClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {isEditing ? (
          <>
            <Textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Write your reflection..."
              className="min-h-[100px]"
              disabled={isLoading}
            />
            <Button 
              onClick={saveReflection} 
              disabled={isLoading || !answer.trim()}
            >
              Save Reflection
            </Button>
          </>
        ) : (
          <>
            <div className="text-left whitespace-pre-wrap">{answer}</div>
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                onClick={() => setIsEditing(true)}
              >
                Edit
              </Button>
              <Button 
                variant="destructive" 
                onClick={deleteReflection} 
                disabled={isLoading}
              >
                Delete Response
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ReflectionModule;
