
import { WeatherData } from "@/types";
import { getWeatherForLocation } from "@/utils/weatherUtils";

// Fetch weather data using actual coordinates
export const fetchWeatherData = async (lat: number, lon: number): Promise<WeatherData> => {
  return await getWeatherForLocation(lat, lon);
};
