
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    
    if (!geminiApiKey) {
      throw new Error('Missing Gemini API key');
    }
    
    // Parse the request body to get the journal entry content
    const { journalContent, mood } = await req.json();
    
    if (!journalContent) {
      throw new Error('Missing journal content');
    }

    const prompt = `
      You are an emotionally intelligent journaling assistant that helps users reflect more deeply on their journal entries.
      
      Based on the following journal entry with mood "${mood}", create ONE thoughtful, emotionally intelligent reflection question.
      Make the question feel human and conversational, as if coming from a supportive friend.
      The question should be only ONE sentence long, be specific to the journal content, and invite meaningful introspection.
      Make sure your response is ONLY the question, with no additional text or explanations.
      
      Journal entry: "${journalContent}"
    `;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 100,
        }
      })
    });

    const data = await response.json();
    console.log("Gemini response:", JSON.stringify(data, null, 2));
    
    if (!data.candidates || data.candidates.length === 0) {
      throw new Error('No response from Gemini API');
    }

    let reflectionQuestion = data.candidates[0].content.parts[0].text.trim();
    
    // Strip quotes if present
    if (reflectionQuestion.startsWith('"') && reflectionQuestion.endsWith('"')) {
      reflectionQuestion = reflectionQuestion.substring(1, reflectionQuestion.length - 1);
    }
    
    // Ensure it ends with a question mark
    if (!reflectionQuestion.endsWith('?')) {
      reflectionQuestion += '?';
    }

    return new Response(JSON.stringify({ 
      reflectionQuestion 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error generating reflection question:', error);
    
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
