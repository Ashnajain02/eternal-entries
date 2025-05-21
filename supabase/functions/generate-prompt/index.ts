
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

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

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { 
            role: 'system', 
            content: `You are a compassionate and emotionally intelligent journaling coach.
            Based on the journal entry provided, write one warm and thoughtful follow-up question that encourages deeper reflection.
            The question should be:
            1. Specific to the content shared
            2. Emotionally intelligent and empathetic
            3. Open-ended to encourage reflection
            4. Concise (one sentence only)
            
            Respond with ONLY the question itself, no introduction or explanation.`
          },
          { role: 'user', content: journalContent }
        ],
        temperature: 0.7,
        max_tokens: 100,
      }),
    });

    const data = await response.json();
    
    if (data.error) {
      throw new Error(`OpenAI API error: ${data.error.message}`);
    }
    
    const promptQuestion = data.choices[0].message.content.trim();

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
