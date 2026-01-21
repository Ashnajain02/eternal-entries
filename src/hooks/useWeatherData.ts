import { useState, useEffect, useCallback, useRef } from 'react';
import { WeatherData } from '@/types';
import { getUserLocation, getWeatherForLocation, DEFAULT_COORDINATES } from '@/utils/weatherUtils';

export function useWeatherData(initialWeather: WeatherData | null = null) {
  const [weatherData, setWeatherData] = useState<WeatherData | null>(initialWeather);
  const [isLoadingWeather, setIsLoadingWeather] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  
  // Guard against concurrent fetches
  const fetchInProgress = useRef(false);

  const handleGetWeather = useCallback(async () => {
    // Prevent overlapping fetches
    if (fetchInProgress.current) return;
    fetchInProgress.current = true;
    
    setIsLoadingWeather(true);
    setLocationError(null);
    
    try {
      const coords = await getUserLocation();
      const data = await getWeatherForLocation(coords.latitude, coords.longitude);
      setWeatherData(data);
    } catch (error) {
      console.error('Error getting weather:', error);
      setLocationError(error instanceof Error ? error.message : "Failed to get location");
      
      // Fallback to default coordinates (location name already cleared upstream)
      try {
        const fallbackData = await getWeatherForLocation(
          DEFAULT_COORDINATES.lat, 
          DEFAULT_COORDINATES.lon
        );
        setWeatherData(fallbackData);
      } catch (fallbackError) {
        console.error('Fallback weather fetch failed:', fallbackError);
      }
    } finally {
      setIsLoadingWeather(false);
      fetchInProgress.current = false;
    }
  }, []);

  // Auto-fetch on mount if no initial data
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
