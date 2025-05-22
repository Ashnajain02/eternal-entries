
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders,
      status: 204,
    });
  }

  try {
    // Get the Gemini API key from environment variables
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set");
    }

    // Parse request body
    const { content, mood } = await req.json();
    
    if (!content) {
      throw new Error("Journal content is required");
    }
    
    // Prepare the prompt for Gemini
    const prompt = `
    You are an emotionally intelligent journaling assistant. Based on the following journal entry:
    
    Content: "${content}"
    Mood: "${mood || 'neutral'}"
    
    Generate a single, thought-provoking reflection question that:
    1. Is directly related to the content and emotion in the entry
    2. Is phrased as a question (always ends with a question mark)
    3. Encourages deeper thinking or self-awareness
    4. Is respectful and compassionate
    5. Is concise (one sentence only)
    6. Sounds natural and conversational (like something a friend might ask)
    
    Provide only the reflection question with no additional text or explanation.
    `;

    // Call Gemini API
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 100,
        }
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Gemini API error: ${JSON.stringify(error)}`);
    }

    const data = await response.json();
    const reflectionQuestion = data.candidates[0].content.parts[0].text.trim();
    
    // Return the reflection question
    return new Response(JSON.stringify({ reflectionQuestion }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
    
  } catch (error) {
    console.error("Error generating reflection:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
