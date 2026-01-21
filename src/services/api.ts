import { supabase } from "@/integrations/supabase/client";

/**
 * Generate multiple reflection questions for a journal entry using the AI
 * Returns an array of 10 unique questions
 */
export const generateReflectionQuestions = async (content: string, mood: string, track?: { name: string; artist: string }): Promise<string[]> => {
  console.log("inside generateReflectionQuestions function");
  try {
    const { data, error } = await supabase.functions.invoke('generate-reflection', {
      body: { content, mood, track }
    });

    if (error) {
      console.error('Supabase function error:', error);
      throw new Error(error.message || 'Error generating reflection questions');
    }

    return data.reflectionQuestions || [data.reflectionQuestion];
  } catch (error: any) {
    console.error('Error calling generate-reflection:', error);
    throw new Error('Failed to generate reflection questions. Please try again later.');
  }
};
