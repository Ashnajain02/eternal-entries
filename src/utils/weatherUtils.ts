
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
 * Maps Open-Meteo weather codes to descriptions and icons.
 * https://open-meteo.com/en/docs
 */
const WEATHER_CODE_MAP: Record<number, { description: string; icon: string }> = {
  0:  { description: 'Clear sky',              icon: 'cloud-sun' },
  1:  { description: 'Mainly clear',           icon: 'cloud-sun' },
  2:  { description: 'Partly cloudy',          icon: 'cloud' },
  3:  { description: 'Overcast',               icon: 'cloud' },
  45: { description: 'Fog',                    icon: 'cloud' },
  48: { description: 'Fog',                    icon: 'cloud' },
  51: { description: 'Drizzle',                icon: 'droplet' },
  53: { description: 'Drizzle',                icon: 'droplet' },
  55: { description: 'Drizzle',                icon: 'droplet' },
  56: { description: 'Freezing Drizzle',       icon: 'thermometer-snowflake' },
  57: { description: 'Freezing Drizzle',       icon: 'thermometer-snowflake' },
  61: { description: 'Rain',                   icon: 'cloud-rain' },
  63: { description: 'Rain',                   icon: 'cloud-rain' },
  65: { description: 'Rain',                   icon: 'cloud-rain' },
  66: { description: 'Freezing Rain',          icon: 'cloud-rain' },
  67: { description: 'Freezing Rain',          icon: 'cloud-rain' },
  71: { description: 'Snow',                   icon: 'thermometer-snowflake' },
  73: { description: 'Snow',                   icon: 'thermometer-snowflake' },
  75: { description: 'Snow',                   icon: 'thermometer-snowflake' },
  77: { description: 'Snow grains',            icon: 'thermometer-snowflake' },
  80: { description: 'Rain showers',           icon: 'cloud-rain' },
  81: { description: 'Rain showers',           icon: 'cloud-rain' },
  82: { description: 'Rain showers',           icon: 'cloud-rain' },
  85: { description: 'Snow showers',           icon: 'thermometer-snowflake' },
  86: { description: 'Snow showers',           icon: 'thermometer-snowflake' },
  95: { description: 'Thunderstorm',           icon: 'cloud-lightning' },
  96: { description: 'Thunderstorm with hail', icon: 'cloud-lightning' },
  99: { description: 'Thunderstorm with hail', icon: 'cloud-lightning' },
};

const mapWeatherCode = (weatherCode: number): { description: string; icon: string } => {
  return WEATHER_CODE_MAP[weatherCode] ?? { description: 'Unknown', icon: 'cloud' };
};
