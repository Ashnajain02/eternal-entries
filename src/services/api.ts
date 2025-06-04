
import { WeatherData } from "@/types";
import { getWeatherForLocation } from "@/utils/weatherUtils";
import { supabase } from "@/integrations/supabase/client";

// Fetch weather data using actual coordinates
export const fetchWeatherData = async (lat: number, lon: number): Promise<WeatherData> => {
  return await getWeatherForLocation(lat, lon);
};

/**
 * Generate a reflection question for a journal entry using the Gemini AI
 */
export const generateReflectionQuestion = async (content: string, mood: string, track?: { name: string; artist: string }): Promise<string> => {
   console.log("inside generateReflectionQuestion function")
  try {
    const { data, error } = await supabase.functions.invoke('generate-reflection', {
      body: { content, mood, track }
    });

    if (error) {
      console.error('Supabase function error:', error);
      throw new Error(error.message || 'Error generating reflection question');
    }

    return data.reflectionQuestion;
  } catch (error: any) {
    console.error('Error calling generate-reflection:', error);
    throw new Error('Failed to generate reflection question. Please try again later.');
  }
};
