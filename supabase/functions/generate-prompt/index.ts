
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

    // Call Gemini API with updated prompt to generate more casual, friendly questions
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
                text: `You're my close friend who cares about me deeply and wants to help me reflect.
                Read this journal entry I wrote, and respond with a casual, friendly follow-up question.
                
                The question should:
                1. Sound completely natural, like something a real friend would text me
                2. Use contractions, casual language, and maybe even add a "hey" or my name
                3. Reference something specific from my entry to show you really read it
                4. Be brief and conversational (one short sentence is perfect)
                5. Feel warm, curious and supportive - not clinical or therapist-like
                
                Respond with ONLY the question itself, no introduction or explanation.
                
                Here is my journal entry:
                ${journalContent}`
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.9,
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
