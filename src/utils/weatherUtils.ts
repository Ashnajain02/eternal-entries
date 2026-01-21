
import { WeatherData } from "@/types";

/**
 * Gets the current user location using the Geolocation API
 * @returns A promise resolving to the user's coordinates
 */
export const getUserLocation = (): Promise<GeolocationCoordinates> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by your browser"));
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve(position.coords);
      },
      (error) => {
        console.error('Geolocation error:', error);
        let errorMsg = "Location access denied";
        
        switch(error.code) {
          case error.PERMISSION_DENIED:
            errorMsg = "You denied permission to access your location";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMsg = "Location information is unavailable";
            break;
          case error.TIMEOUT:
            errorMsg = "The request to get your location timed out";
            break;
          default:
            errorMsg = "An unknown error occurred";
        }
        reject(new Error(errorMsg));
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 60000
      }
    );
  });
};

/**
 * Default coordinates to use as fallback when user location cannot be obtained
 * Note: We'll still get weather data but won't display the location name
 */
export const DEFAULT_COORDINATES = {
  lat: 40.7831, 
  lon: -73.9712 // Manhattan, NYC
};

/**
 * Get the location name from coordinates using OpenStreetMap's Nominatim API
 * @param lat Latitude
 * @param lon Longitude
 * @returns A string representing the location name
 */
export const getLocationNameFromCoordinates = async (lat: number, lon: number): Promise<string | null> => {
  try {
    // Check if these are the default coordinates
    const isDefaultLocation = 
      Math.abs(lat - DEFAULT_COORDINATES.lat) < 0.001 && 
      Math.abs(lon - DEFAULT_COORDINATES.lon) < 0.001;
    
    // If these are default coordinates, don't fetch the location name
    if (isDefaultLocation) {
      console.log('Using default coordinates - not displaying location name');
      return null;
    }
    
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
      {
        headers: {
          'User-Agent': 'WeatherJournal App'
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`Failed to get location: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Extract the most relevant location name
    // Prioritize city/town name, fall back to other address components
    const address = data.address;
    const locationName = 
      address.city || 
      address.town || 
      address.village || 
      address.suburb || 
      address.county ||
      address.state;
    
    if (locationName) {
      return `${locationName}, ${address.state || address.country_code?.toUpperCase() || ''}`.trim();
    } else {
      return data.display_name.split(',').slice(0, 2).join(',');
    }
  } catch (error) {
    console.error('Error getting location name:', error);
    return null;
  }
};

/**
 * Fetch weather data for the given coordinates
 * Fetches weather and location name in parallel for better performance
 */
export const getWeatherForLocation = async (lat: number, lon: number): Promise<WeatherData> => {
  // Fetch weather and location name in parallel
  const [weatherResult, locationName] = await Promise.all([
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&temperature_unit=celsius`
    ).then(async (res) => {
      if (!res.ok) throw new Error(`Weather API error: ${res.status}`);
      return res.json();
    }),
    // Location fetch is non-critical — gracefully return null on failure
    getLocationNameFromCoordinates(lat, lon).catch((err) => {
      console.warn('Location name fetch failed, continuing without it:', err);
      return null;
    })
  ]);

  const { description, icon } = mapWeatherCode(weatherResult.current.weather_code);

  return {
    temperature: weatherResult.current.temperature_2m,
    description,
    icon,
    location: locationName || ''
  };
};

/**
 * Maps Open-Meteo weather codes to descriptions and icons
 * @param weatherCode The weather code from Open-Meteo API
 * @returns Object with description and icon
 */
const mapWeatherCode = (weatherCode: number): { description: string; icon: string } => {
  // Weather code mapping based on Open-Meteo documentation
  // https://open-meteo.com/en/docs
  switch (true) {
    case weatherCode === 0:
      return { description: 'Clear sky', icon: 'cloud-sun' };
    case weatherCode === 1:
      return { description: 'Mainly clear', icon: 'cloud-sun' };
    case weatherCode === 2:
      return { description: 'Partly cloudy', icon: 'cloud' };
    case weatherCode === 3:
      return { description: 'Overcast', icon: 'cloud' };
    case [45, 48].includes(weatherCode):
      return { description: 'Fog', icon: 'cloud' };
    case [51, 53, 55].includes(weatherCode):
      return { description: 'Drizzle', icon: 'droplet' };
    case [56, 57].includes(weatherCode):
      return { description: 'Freezing Drizzle', icon: 'thermometer-snowflake' };
    case [61, 63, 65].includes(weatherCode):
      return { description: 'Rain', icon: 'cloud-rain' };
    case [66, 67].includes(weatherCode):
      return { description: 'Freezing Rain', icon: 'cloud-rain' };
    case [71, 73, 75].includes(weatherCode):
      return { description: 'Snow', icon: 'thermometer-snowflake' };
    case [77].includes(weatherCode):
      return { description: 'Snow grains', icon: 'thermometer-snowflake' };
    case [80, 81, 82].includes(weatherCode):
      return { description: 'Rain showers', icon: 'cloud-rain' };
    case [85, 86].includes(weatherCode):
      return { description: 'Snow showers', icon: 'thermometer-snowflake' };
    case [95].includes(weatherCode):
      return { description: 'Thunderstorm', icon: 'cloud-moon-rain' };
    case [96, 99].includes(weatherCode):
      return { description: 'Thunderstorm with hail', icon: 'cloud-moon-rain' };
    default:
      return { description: 'Unknown', icon: 'cloud' };
  }
};
