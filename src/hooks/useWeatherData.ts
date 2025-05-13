
import { useState, useEffect, useCallback } from 'react';
import { WeatherData } from '@/types';
import { getUserLocation, getWeatherForLocation, DEFAULT_COORDINATES } from '@/utils/weatherUtils';

export function useWeatherData(initialWeather: WeatherData | null = null) {
  const [weatherData, setWeatherData] = useState<WeatherData | null>(initialWeather);
  const [isLoadingWeather, setIsLoadingWeather] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const handleGetWeather = useCallback(async () => {
    setIsLoadingWeather(true);
    setLocationError(null);
    
    try {
      // Try to get user's location
      const coords = await getUserLocation();
      const data = await getWeatherForLocation(coords.latitude, coords.longitude);
      setWeatherData(data);
    } catch (error) {
      console.error('Error getting weather:', error);
      setLocationError(error instanceof Error ? error.message : "Failed to get location");
      
      // Use fallback coordinates - but don't display the location name
      try {
        const fallbackData = await getWeatherForLocation(
          DEFAULT_COORDINATES.lat, 
          DEFAULT_COORDINATES.lon
        );
        // Clear the location when using default coordinates
        fallbackData.location = '';
        setWeatherData(fallbackData);
      } catch (fallbackError) {
        console.error('Even fallback weather failed:', fallbackError);
      }
    } finally {
      setIsLoadingWeather(false);
    }
  }, []);

  // Get current weather on first load if not already present
  useEffect(() => {
    if (!weatherData && !isLoadingWeather) {
      handleGetWeather();
    }
  }, [weatherData, isLoadingWeather, handleGetWeather]);

  return {
    weatherData,
    setWeatherData,
    isLoadingWeather,
    locationError,
    handleGetWeather
  };
}
