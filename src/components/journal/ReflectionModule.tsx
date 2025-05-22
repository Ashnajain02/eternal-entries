
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, RefreshCw, X } from "lucide-react";
import AutoResizeTextarea from "../AutoResizeTextarea";
import { JournalEntry } from "@/types";
import { useJournal } from "@/contexts/JournalContext";

interface ReflectionModuleProps {
  entry: JournalEntry;
}

const ReflectionModule: React.FC<ReflectionModuleProps> = ({ entry }) => {
  const { updateEntry } = useJournal();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [reflectionQuestion, setReflectionQuestion] = useState<string | null>(entry.reflection_question || null);
  const [reflectionAnswer, setReflectionAnswer] = useState<string>(entry.reflection_answer || '');
  const [isAnswerSaved, setIsAnswerSaved] = useState(!!entry.reflection_answer);
  const [showModule, setShowModule] = useState(!!entry.reflection_question);
  
  const generateReflectionQuestion = async () => {
    setGenerating(true);
    try {
      const response = await fetch(`${window.location.origin}/api/generate-reflection`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          journalContent: entry.content,
          mood: entry.mood
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate reflection question');
      }
      
      const data = await response.json();
      setReflectionQuestion(data.reflectionQuestion);
      setShowModule(true);
      setIsAnswerSaved(false);
      setReflectionAnswer('');
    } catch (error) {
      console.error('Error generating reflection:', error);
      toast({
        title: "Error generating reflection",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };
  
  const saveReflection = async () => {
    if (!reflectionQuestion || !reflectionAnswer.trim()) {
      toast({
        title: "Cannot save empty reflection",
        description: "Please write a response to the reflection question.",
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);
    try {
      // Update the entry with reflection data
      await updateEntry({
        ...entry,
        reflection_question: reflectionQuestion,
        reflection_answer: reflectionAnswer.trim(),
      });
      
      setIsAnswerSaved(true);
      toast({
        title: "Reflection saved",
        description: "Your reflection has been saved successfully.",
      });
    } catch (error) {
      console.error('Error saving reflection:', error);
      toast({
        title: "Error saving reflection",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  const deleteReflection = async () => {
    setLoading(true);
    try {
      // Remove reflection data from the entry
      await updateEntry({
        ...entry,
        reflection_question: undefined,
        reflection_answer: undefined,
      });
      
      setReflectionQuestion(null);
      setReflectionAnswer('');
      setIsAnswerSaved(false);
      setShowModule(false);
      
      toast({
        title: "Reflection deleted",
        description: "Your reflection has been deleted successfully.",
      });
    } catch (error) {
      console.error('Error deleting reflection:', error);
      toast({
        title: "Error deleting reflection",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  const dismissReflection = () => {
    setShowModule(false);
    setReflectionQuestion(null);
    setReflectionAnswer('');
  };
  
  if (!showModule) {
    return (
      <div className="mt-6">
        <Button 
          onClick={generateReflectionQuestion}
          disabled={generating}
          className="w-full"
        >
          {generating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
              Generating Reflection Question...
            </>
          ) : (
            "Generate Reflection Question"
          )}
        </Button>
      </div>
    );
  }
  
  return (
    <div className="mt-6 border rounded-md p-4 bg-muted/30">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-grow pr-2">
          <p className="font-medium text-lg">{reflectionQuestion}</p>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={generateReflectionQuestion}
            disabled={generating || loading}
            className="h-8 w-8"
            title="Regenerate question"
          >
            {generating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={dismissReflection}
            disabled={loading}
            className="h-8 w-8"
            title="Dismiss"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {isAnswerSaved ? (
        <>
          <div className="mb-4 whitespace-pre-wrap border p-3 rounded bg-background">
            {reflectionAnswer}
          </div>
          <div className="flex justify-end">
            <Button 
              variant="destructive"
              onClick={deleteReflection}
              disabled={loading}
              size="sm"
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                "Delete Response"
              )}
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className="mb-4">
            <AutoResizeTextarea
              value={reflectionAnswer}
              onChange={(e) => setReflectionAnswer(e.target.value)}
              placeholder="Write your reflection here..."
              className="w-full"
              minHeight="80px"
            />
          </div>
          <div className="flex justify-end">
            <Button 
              onClick={saveReflection}
              disabled={loading || !reflectionAnswer.trim()}
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                "Save Response"
              )}
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default ReflectionModule;
