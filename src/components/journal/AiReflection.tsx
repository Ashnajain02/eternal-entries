
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';

interface AiReflectionProps {
  entryContent: string;
  className?: string;
}

const AiReflection: React.FC<AiReflectionProps> = ({ entryContent, className }) => {
  const [question, setQuestion] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const generateReflection = async () => {
    if (!entryContent.trim()) {
      setError("Can't generate a reflection for an empty journal entry.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.functions.invoke('journal-reflection', {
        body: { entryText: entryContent }
      });
      
      if (error) throw new Error(error.message);
      
      if (data && data.question) {
        setQuestion(data.question);
      } else {
        throw new Error('No reflection question received');
      }
    } catch (err) {
      console.error('Error getting reflection:', err);
      setError('Unable to generate a reflection question. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`mt-6 ${className || ''}`}>
      {!question && !isLoading && (
        <Button 
          onClick={generateReflection} 
          variant="outline" 
          className="w-full"
        >
          Get a reflection question
        </Button>
      )}

      {isLoading && (
        <div className="text-center p-4 border border-border rounded-md">
          <Loader2 className="h-5 w-5 animate-spin text-primary mx-auto" />
          <p className="mt-2 text-sm text-muted-foreground">Reflecting on your entry...</p>
        </div>
      )}

      {error && (
        <Alert variant="destructive" className="mt-2">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {question && !isLoading && (
        <div className="border border-border rounded-md p-4 bg-card">
          <h4 className="text-sm text-muted-foreground mb-1">A question for deeper reflection:</h4>
          <p className="font-medium text-primary">{question}</p>
        </div>
      )}
    </div>
  );
};

export default AiReflection;
