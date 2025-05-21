
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

    // Call Gemini API with updated prompt to generate more friendly, conversational questions
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
                text: `You are a thoughtful, empathetic journaling companion.
                Based on the journal entry below, create a gentle, caring follow-up question that feels like it comes from a supportive friend, not an AI.
                The reflection question should:
                1. Feel warm and conversational (use "you" and avoid academic or clinical phrasing)
                2. Reference specific content from their entry to feel personalized
                3. Invite deeper emotional reflection in a gentle way
                4. Be phrased in a casual, friendly tone like a trusted friend would use
                5. Be concise (one sentence only)
                
                Respond with ONLY the question itself, no introduction or explanation.
                
                Here is the journal entry:
                ${journalContent}`
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.8,
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
