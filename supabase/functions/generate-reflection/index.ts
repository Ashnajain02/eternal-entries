
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
    let requestData;
    try {
      requestData = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const { content, mood, track } = requestData;
    
    // Validate content - required, must be string, max 10000 chars
    if (!content || typeof content !== 'string') {
      return new Response(JSON.stringify({ error: "Journal content is required and must be a string" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }
    
    if (content.length > 10000) {
      return new Response(JSON.stringify({ error: "Journal content exceeds maximum length of 10000 characters" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }
    
    // Validate mood - optional, must be string if provided, max 50 chars
    if (mood !== undefined && (typeof mood !== 'string' || mood.length > 50)) {
      return new Response(JSON.stringify({ error: "Mood must be a string with maximum 50 characters" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }
    
    // Validate track - optional, must be object with name/artist strings if provided
    if (track !== undefined) {
      if (typeof track !== 'object' || track === null) {
        return new Response(JSON.stringify({ error: "Track must be an object" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }
      if (track.name && (typeof track.name !== 'string' || track.name.length > 200)) {
        return new Response(JSON.stringify({ error: "Track name must be a string with maximum 200 characters" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }
      if (track.artist && (typeof track.artist !== 'string' || track.artist.length > 200)) {
        return new Response(JSON.stringify({ error: "Track artist must be a string with maximum 200 characters" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }
    }
    
    // Sanitize inputs by trimming whitespace
    const sanitizedContent = content.trim();
    const sanitizedMood = mood?.trim() || 'neutral';
    
    // Build the track context if provided
    let trackContext = "";
    if (track && track.name && track.artist) {
      trackContext = `\nSong: "${track.name}" by ${track.artist}`;
    }
    
    // Prepare the prompt for Gemini
    const prompt = `
    You are an emotionally intelligent journaling assistant. Based on the following journal entry:
    
    Content: "${sanitizedContent}"
    Mood: "${sanitizedMood}"${trackContext}
    
    Generate a single question that:
    1. Is directly related to the content and emotion in the entry
    2. Is phrased as a question (always ends with a question mark)
    4. Is respectful and compassionate
    5. Is concise (one sentence only)
    6. Sounds natural and conversational (like something a friend might ask - not professional like a therapist)
    7. Focuses on one specific memory, detail, object, place, person from their entry${track ? " or about the song they chose" : ""}
    8. Are phrased a: "who?" or "what?" or "when?" or "where?" or "why?" question
    
    Provide only the reflection question with no additional text or explanation.
    `;

    console.log("Calling Gemini API...")

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
    console.log("Received response from Gemini API")

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
