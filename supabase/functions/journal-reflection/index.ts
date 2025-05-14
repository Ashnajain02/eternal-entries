
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const openAiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAiApiKey) {
      throw new Error('OpenAI API key is not configured');
    }

    // Parse request body
    const { entryText } = await req.json();
    if (!entryText) {
      throw new Error('No journal entry text provided');
    }

    // Create prompt for the AI
    const prompt = `You are a supportive and emotionally intelligent AI journaling companion. After reading a user's journal entry, ask one simple and thoughtful follow-up question to help them reflect more deeply. If the journal is about a specific topic or person, make sure that's reflected in the question. Keep it warm, sincere, and just one sentence long. Do not introduce the question—only output the question.

Here is a journal entry written by the user:

"${entryText}"

Take a moment to understand what they're expressing. Now, based on this entry, ask the user one gentle follow-up question that might help them reflect more deeply or explore their thoughts further. Your question should:
- Be a single, simple sentence.
- Feel human and compassionate, not robotic.
- Avoid restating the entry.
- Ask about a feeling, motive, or next step.

Example formats:
- "What do you think is making you feel that way?"
- "What would help you feel more at peace with this?"
- "Is there something you're holding back from expressing?"

Now, write your question. Remember to be specific to the topic of the users journal`;

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // Using a fast, economical model
        messages: [
          { role: 'system', content: 'You are a journaling assistant that provides thoughtful follow-up questions.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 50, // Short responses only
      }),
    });

    const data = await response.json();
    
    if (data.error) {
      throw new Error(`OpenAI API error: ${data.error.message}`);
    }

    const reflectionQuestion = data.choices && data.choices[0]?.message?.content?.trim();

    return new Response(
      JSON.stringify({ question: reflectionQuestion }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('Error generating reflection:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to generate reflection question'
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});
