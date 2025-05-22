
import { WeatherData } from "@/types";
import { getWeatherForLocation } from "@/utils/weatherUtils";
import { supabase } from "@/integrations/supabase/client";

// Fetch weather data using actual coordinates
export const fetchWeatherData = async (lat: number, lon: number): Promise<WeatherData> => {
  return await getWeatherForLocation(lat, lon);
};

// Generate reflection question using Gemini AI
export const generateReflectionQuestion = async (content: string, mood: string): Promise<string> => {
  try {
    const { data, error } = await supabase.functions.invoke('generate-reflection', {
      body: { content, mood }
    });

    if (error) {
      throw new Error(`Error invoking function: ${error.message}`);
    }

    return data.reflectionQuestion;
  } catch (error) {
    console.error('Error generating reflection question:', error);
    throw error;
  }
};
