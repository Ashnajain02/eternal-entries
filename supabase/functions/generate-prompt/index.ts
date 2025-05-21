
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const geminiApiKey = Deno.env.get('GEMINI_API_KEY');

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
    const { journalContent } = await req.json();

    if (!journalContent || journalContent.length < 50) {
      return new Response(
        JSON.stringify({ error: 'Journal content is too short for analysis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call Gemini API instead of OpenAI
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': geminiApiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `You are a compassionate and emotionally intelligent journaling coach.
                Based on the journal entry provided, write one warm and thoughtful follow-up question that encourages deeper reflection.
                The question should be:
                1. Specific to the content shared
                2. Emotionally intelligent and empathetic
                3. Open-ended to encourage reflection
                4. Concise (one sentence only)
                
                Respond with ONLY the question itself, no introduction or explanation.
                
                Here is the journal entry:
                ${journalContent}`
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 100,
        }
      }),
    });

    const data = await response.json();
    
    if (data.error) {
      throw new Error(`Gemini API error: ${data.error.message}`);
    }
    
    // Extract the prompt question from Gemini's response format
    const promptQuestion = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    
    if (!promptQuestion) {
      throw new Error('Failed to generate a prompt from Gemini API');
    }

    return new Response(
      JSON.stringify({ prompt: promptQuestion }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error generating AI prompt:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
