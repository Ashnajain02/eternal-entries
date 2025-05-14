
import { WeatherData } from "@/types";
import { getWeatherForLocation } from "@/utils/weatherUtils";
import { supabase } from "@/integrations/supabase/client";

// Fetch weather data using actual coordinates
export const fetchWeatherData = async (lat: number, lon: number): Promise<WeatherData> => {
  return await getWeatherForLocation(lat, lon);
};

// Get AI reflection for journal entry
export const getAiReflection = async (entryText: string): Promise<string> => {
  try {
    const { data, error } = await supabase.functions.invoke('journal-reflection', {
      body: { entryText }
    });
    
    if (error) throw error;
    return data?.question || '';
  } catch (error) {
    console.error('Error getting AI reflection:', error);
    throw error;
  }
};
