
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
        enableHighAccuracy: false,
        timeout: 5000,
        maximumAge: 60000
      }
    );
  });
};

/**
 * Default coordinates to use as fallback when user location cannot be obtained
 */
export const DEFAULT_COORDINATES = {
  lat: 40.7831, 
  lon: -73.9712 // Manhattan, NYC
};

/**
 * Fetch weather data for the given coordinates
 * @param lat Latitude
 * @param lon Longitude
 * @returns Promise resolving to weather data
 */
export const getWeatherForLocation = async (lat: number, lon: number): Promise<WeatherData> => {
  try {
    // In a real app, this would call an actual weather API
    // For this demo, we generate pseudo-random but deterministic weather
    const temperature = Math.floor(Math.abs((lat * lon * 0.01) % 30) + 5);
    
    const descriptions = [
      'Clear sky', 'Few clouds', 'Scattered clouds', 
      'Light rain', 'Moderate rain', 'Heavy rain',
      'Thunderstorm', 'Snow', 'Mist'
    ];
    
    const weatherIcons = [
      'cloud-sun', 'cloud-rain', 'sun', 
      'cloud', 'cloud-moon-rain', 'thermometer-sun',
      'thermometer-snowflake', 'droplet', 'cloud-moon-rain'
    ];
    
    // Use coordinates to select weather conditions deterministically
    const hash = Math.abs((lat * 100 + lon * 100));
    const descriptionIndex = hash % descriptions.length;
    const iconIndex = (hash * 31) % weatherIcons.length;
    
    // Get location name from coordinates
    const locationName = await getLocationNameFromCoordinates(lat, lon);
    
    return {
      temperature,
      description: descriptions[descriptionIndex],
      icon: weatherIcons[iconIndex],
      location: locationName
    };
  } catch (error) {
    console.error('Error generating weather data:', error);
    throw error;
  }
};

/**
 * Get the location name from coordinates
 * @param lat Latitude
 * @param lon Longitude
 * @returns A string representing the location name
 */
const getLocationNameFromCoordinates = async (lat: number, lon: number): Promise<string> => {
  // In a real app, this would use a reverse geocoding API
  // Here we use a lookup table for common locations
  
  // Bay Area cities
  if (lat > 37.40 && lat < 37.48 && lon > -122.00 && lon < -121.85) return "Milpitas, CA";
  if (lat > 37.32 && lat < 37.40 && lon > -122.05 && lon < -121.94) return "San Jose, CA";
  if (lat > 37.48 && lat < 37.55 && lon > -122.05 && lon < -121.95) return "Fremont, CA";
  if (lat > 37.30 && lat < 37.38 && lon > -121.94 && lon < -121.88) return "Santa Clara, CA";
  if (lat > 37.50 && lat < 37.60 && lon > -122.15 && lon < -122.05) return "Redwood City, CA";
  if (lat > 37.38 && lat < 37.43 && lon > -122.18 && lon < -122.08) return "Palo Alto, CA";
  if (lat > 37.76 && lat < 37.82 && lon > -122.45 && lon < -122.35) return "San Francisco, CA";
  
  // New England cities and towns
  if (lat > 42.30 && lat < 42.35 && lon > -71.85 && lon < -71.75) return "Northborough, MA";
  if (lat > 42.35 && lat < 42.38 && lon > -71.80 && lon < -71.75) return "Marlborough, MA";
  if (lat > 42.25 && lat < 42.30 && lon > -71.85 && lon < -71.78) return "Westborough, MA";
  if (lat > 42.35 && lat < 42.40 && lon > -71.15 && lon < -71.05) return "Cambridge, MA";
  if (lat > 42.32 && lat < 42.38 && lon > -71.10 && lon < -71.04) return "Boston, MA";
  
  // New York City and boroughs
  if (lat > 40.70 && lat < 40.74 && lon > -74.02 && lon < -73.95) return "Lower Manhattan, NY";
  if (lat > 40.74 && lat < 40.78 && lon > -74.02 && lon < -73.95) return "Midtown Manhattan, NY";
  if (lat > 40.78 && lat < 40.82 && lon > -74.02 && lon < -73.93) return "Upper Manhattan, NY";
  if (lat > 40.65 && lat < 40.70 && lon > -74.02 && lon < -73.95) return "Brooklyn, NY";
  if (lat > 40.73 && lat < 40.77 && lon > -73.95 && lon < -73.90) return "Queens, NY";
  if (lat > 40.80 && lat < 40.87 && lon > -73.93 && lon < -73.85) return "The Bronx, NY";
  if (lat > 40.50 && lat < 40.65 && lon > -74.25 && lon < -74.05) return "Staten Island, NY";
  
  // Chicago neighborhoods
  if (lat > 41.87 && lat < 41.90 && lon > -87.64 && lon < -87.62) return "Downtown Chicago, IL";
  if (lat > 41.90 && lat < 41.95 && lon > -87.68 && lon < -87.63) return "Lincoln Park, Chicago, IL";
  if (lat > 41.85 && lat < 41.87 && lon > -87.68 && lon < -87.64) return "West Loop, Chicago, IL";
  
  // Try to find the closest known city
  const cities = [
    {name: 'San Francisco', state: 'CA', lat: 37.7749, lon: -122.4194},
    {name: 'New York', state: 'NY', lat: 40.7128, lon: -74.0060},
    {name: 'Los Angeles', state: 'CA', lat: 33.7490, lon: -118.3810},
    {name: 'Chicago', state: 'IL', lat: 41.8781, lon: -87.6298},
    {name: 'Seattle', state: 'WA', lat: 47.6062, lon: -122.3321},
    {name: 'Boston', state: 'MA', lat: 42.3601, lon: -71.0589},
    {name: 'Austin', state: 'TX', lat: 30.2672, lon: -97.7431},
    {name: 'Miami', state: 'FL', lat: 25.7617, lon: -80.1918},
    {name: 'Denver', state: 'CO', lat: 39.7392, lon: -104.9903},
    {name: 'Portland', state: 'OR', lat: 45.5051, lon: -122.6750},
    {name: 'San Jose', state: 'CA', lat: 37.3382, lon: -121.8863},
    {name: 'Atlanta', state: 'GA', lat: 33.7490, lon: -84.3880},
    {name: 'Houston', state: 'TX', lat: 29.7604, lon: -95.3698}
  ];
  
  let closestCity = cities[0];
  let shortestDistance = calculateDistance(lat, lon, closestCity.lat, closestCity.lon);
  
  for (const city of cities) {
    const distance = calculateDistance(lat, lon, city.lat, city.lon);
    if (distance < shortestDistance) {
      shortestDistance = distance;
      closestCity = city;
    }
  }
  
  // If close enough to a known city, return it
  if (shortestDistance < 0.5) {
    return `${closestCity.name}, ${closestCity.state}`;
  }
  
  // Last resort - create a region description
  const region = getRegionFromCoordinates(lat, lon);
  return region;
};

/**
 * Calculate the distance between two coordinate points
 */
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  return Math.sqrt(Math.pow(lat1 - lat2, 2) + Math.pow(lon1 - lon2, 2));
};

/**
 * Get a generic region description based on coordinates
 */
const getRegionFromCoordinates = (lat: number, lon: number): string => {
  // US regions
  if (lat > 24 && lat < 50 && lon > -125 && lon < -66) {
    if (lon < -100) return "Western US";
    if (lon < -85) return "Central US";
    return "Eastern US";
  }
  
  // Simple cardinal direction
  const ns = lat > 0 ? "North" : "South";
  const ew = lon > 0 ? "East" : "West";
  return `${ns}${ew} Region`;
};
