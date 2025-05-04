
import { SpotifyTrack, WeatherData } from "@/types";

// Fetch weather data using actual coordinates
export const fetchWeatherData = async (lat: number, lon: number): Promise<WeatherData> => {
  try {
    console.log(`Fetching weather data for coordinates: ${lat}, ${lon}`);
    
    // In a real application, this would be an actual API call
    // For example: 
    // const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`);
    // const data = await response.json();
    
    // For now, we'll simulate a successful response based on the coordinates
    // In a production app, you would replace this with an actual API call
    
    // Generate deterministic but varied temperature based on coordinates
    let temperature = Math.floor(Math.abs((lat * lon * 0.01) % 30) + 5); // Generate temperature between 5-35°C
    
    // Simulate different weather conditions based on coordinates
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
    
    // Use coordinates to deterministically select weather conditions
    const hash = Math.abs((lat * 100 + lon * 100));
    const descriptionIndex = hash % descriptions.length;
    const iconIndex = (hash * 31) % weatherIcons.length;
    
    // Get location name from coordinates
    const cityData = await getLocationNameFromCoordinates(lat, lon);
    
    return {
      temperature,
      description: descriptions[descriptionIndex],
      icon: weatherIcons[iconIndex],
      location: cityData
    };
  } catch (error) {
    console.error('Error fetching weather data:', error);
    throw new Error('Failed to fetch weather data');
  }
};

// Helper to get location name from coordinates
const getLocationNameFromCoordinates = async (lat: number, lon: number): Promise<string> => {
  try {
    // In a production app, you would use a reverse geocoding API
    
    // These are more precise location mappings for specific areas
    // Bay Area cities (California)
    if (lat > 37.40 && lat < 37.48 && lon > -122.00 && lon < -121.85) {
      return "Milpitas, CA";
    } else if (lat > 37.32 && lat < 37.40 && lon > -122.05 && lon < -121.94) {
      return "San Jose, CA";
    } else if (lat > 37.48 && lat < 37.55 && lon > -122.05 && lon < -121.95) {
      return "Fremont, CA";
    } else if (lat > 37.30 && lat < 37.38 && lon > -121.94 && lon < -121.88) {
      return "Santa Clara, CA";
    } else if (lat > 37.50 && lat < 37.60 && lon > -122.15 && lon < -122.05) {
      return "Redwood City, CA";
    } else if (lat > 37.38 && lat < 37.43 && lon > -122.18 && lon < -122.08) {
      return "Palo Alto, CA";
    } else if (lat > 37.76 && lat < 37.82 && lon > -122.45 && lon < -122.35) {
      return "San Francisco, CA";
    }
    
    // New England cities and towns
    if (lat > 42.30 && lat < 42.35 && lon > -71.85 && lon < -71.75) {
      return "Northborough, MA";
    } else if (lat > 42.35 && lat < 42.38 && lon > -71.80 && lon < -71.75) {
      return "Marlborough, MA";
    } else if (lat > 42.25 && lat < 42.30 && lon > -71.85 && lon < -71.78) {
      return "Westborough, MA";
    } else if (lat > 42.35 && lat < 42.40 && lon > -71.15 && lon < -71.05) {
      return "Cambridge, MA";
    } else if (lat > 42.32 && lat < 42.38 && lon > -71.10 && lon < -71.04) {
      return "Boston, MA";
    }
    
    // New York City and boroughs
    if (lat > 40.70 && lat < 40.74 && lon > -74.02 && lon < -73.95) {
      return "Lower Manhattan, NY";
    } else if (lat > 40.74 && lat < 40.78 && lon > -74.02 && lon < -73.95) {
      return "Midtown Manhattan, NY";
    } else if (lat > 40.78 && lat < 40.82 && lon > -74.02 && lon < -73.93) {
      return "Upper Manhattan, NY";
    } else if (lat > 40.65 && lat < 40.70 && lon > -74.02 && lon < -73.95) {
      return "Brooklyn, NY";
    } else if (lat > 40.73 && lat < 40.77 && lon > -73.95 && lon < -73.90) {
      return "Queens, NY";
    } else if (lat > 40.80 && lat < 40.87 && lon > -73.93 && lon < -73.85) {
      return "The Bronx, NY";
    } else if (lat > 40.50 && lat < 40.65 && lon > -74.25 && lon < -74.05) {
      return "Staten Island, NY";
    }
    
    // Chicago neighborhoods
    if (lat > 41.87 && lat < 41.90 && lon > -87.64 && lon < -87.62) {
      return "Downtown Chicago, IL";
    } else if (lat > 41.90 && lat < 41.95 && lon > -87.68 && lon < -87.63) {
      return "Lincoln Park, Chicago, IL";
    } else if (lat > 41.85 && lat < 41.87 && lon > -87.68 && lon < -87.64) {
      return "West Loop, Chicago, IL";
    }
    
    // More generic but still useful US regions
    if (lat > 33.5 && lat < 34.5 && lon > -118.5 && lon < -117.5) {
      return "Los Angeles Area, CA";
    } else if (lat > 47.5 && lat < 47.8 && lon > -122.4 && lon < -122.2) {
      return "Seattle Area, WA";
    } else if (lat > 30.0 && lat < 30.5 && lon > -98.0 && lon < -97.5) {
      return "Austin Area, TX";
    } else if (lat > 29.6 && lat < 29.9 && lon > -95.6 && lon < -95.2) {
      return "Houston Area, TX";
    } else if (lat > 39.7 && lat < 39.9 && lon > -105.1 && lon < -104.9) {
      return "Denver Area, CO";
    }
    
    // Create a more specific city name based on the coordinates
    // This will use a larger set of city names and determine which one is "closest"
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
      {name: 'Dallas', state: 'TX', lat: 32.7767, lon: -96.7970},
      {name: 'Houston', state: 'TX', lat: 29.7604, lon: -95.3698},
      {name: 'Phoenix', state: 'AZ', lat: 33.4484, lon: -112.0740},
      {name: 'Philadelphia', state: 'PA', lat: 39.9526, lon: -75.1652},
      {name: 'San Diego', state: 'CA', lat: 32.7157, lon: -117.1611},
      {name: 'Minneapolis', state: 'MN', lat: 44.9778, lon: -93.2650},
      {name: 'Detroit', state: 'MI', lat: 42.3314, lon: -83.0458},
      {name: 'Pittsburgh', state: 'PA', lat: 40.4406, lon: -79.9959},
      {name: 'Sacramento', state: 'CA', lat: 38.5816, lon: -121.4944},
      {name: 'Las Vegas', state: 'NV', lat: 36.1699, lon: -115.1398},
      {name: 'Milwaukee', state: 'WI', lat: 43.0389, lon: -87.9065},
      {name: 'Albuquerque', state: 'NM', lat: 35.0844, lon: -106.6504},
      {name: 'Kansas City', state: 'MO', lat: 39.0997, lon: -94.5786},
      {name: 'Tucson', state: 'AZ', lat: 32.2226, lon: -110.9747},
      {name: 'Nashville', state: 'TN', lat: 36.1627, lon: -86.7816},
      {name: 'Cleveland', state: 'OH', lat: 41.4993, lon: -81.6944},
      {name: 'Salt Lake City', state: 'UT', lat: 40.7608, lon: -111.8910},
      {name: 'Cincinnati', state: 'OH', lat: 39.1031, lon: -84.5120}
    ];
    
    let closestCity = null;
    let shortestDistance = Infinity;
    
    // Find the closest city to the provided coordinates
    for (const city of cities) {
      const distance = Math.sqrt(
        Math.pow(lat - city.lat, 2) + 
        Math.pow(lon - city.lon, 2)
      );
      
      if (distance < shortestDistance) {
        shortestDistance = distance;
        closestCity = city;
      }
    }
    
    if (closestCity && shortestDistance < 1.5) { // Within a reasonable distance
      return `${closestCity.name}, ${closestCity.state}`;
    }
    
    // If no specific match found and not close to any known city,
    // calculate a rough area description based on coordinates
    const getCardinalDirection = (lat: number, lon: number) => {
      let ns = lat > 0 ? 'North' : 'South';
      let ew = lon > 0 ? 'East' : 'West';
      
      let region = '';
      // US regions
      if (lat > 24 && lat < 50 && lon > -125 && lon < -66) {
        // Continental US
        if (lon < -100) region = 'Western ';
        else if (lon < -85) region = 'Central ';
        else region = 'Eastern ';
        
        return `${region}US Region`;
      }
      
      return `${ns}${ew} Region`;
    };
    
    return getCardinalDirection(lat, lon);
  } catch (error) {
    console.error('Error getting location name:', error);
    return 'Unknown Location';
  }
};

// Simulate Spotify API search
export const searchSpotifyTrack = async (query: string): Promise<SpotifyTrack[]> => {
  try {
    console.log(`Searching Spotify for: ${query}`);
    
    // In a real application, this would be an actual API call
    // For example:
    // const response = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=5`, {
    //   headers: {
    //     'Authorization': `Bearer ${accessToken}`
    //   }
    // });
    // const data = await response.json();
    
    // For now, we'll simulate a successful response with mock data
    const mockTracks: SpotifyTrack[] = [
      {
        id: '1',
        name: 'Bohemian Rhapsody',
        artist: 'Queen',
        album: 'A Night at the Opera',
        albumArt: 'https://i.scdn.co/image/ab67616d0000b2734cf47a6635a6055657b4b8ae',
        uri: 'spotify:track:7tFiyTwD0nx5a1eklYtX2J'
      },
      {
        id: '2',
        name: 'Imagine',
        artist: 'John Lennon',
        album: 'Imagine',
        albumArt: 'https://i.scdn.co/image/ab67616d0000b273d750ac1202fe5d51d5d32fd0',
        uri: 'spotify:track:7pKfPomDEeI4TPT6EOYjn9'
      },
      {
        id: '3',
        name: 'Billie Jean',
        artist: 'Michael Jackson',
        album: 'Thriller',
        albumArt: 'https://i.scdn.co/image/ab67616d0000b2734121faee8df82c526cbab2be',
        uri: 'spotify:track:5ChkMS8OtdzJeqyybCc9R5'
      },
      {
        id: '4',
        name: 'Like a Rolling Stone',
        artist: 'Bob Dylan',
        album: 'Highway 61 Revisited',
        albumArt: 'https://i.scdn.co/image/ab67616d0000b2736960c5f4eb72f0ecafe44a8c',
        uri: 'spotify:track:3AhXZa8sUQht0UEdBJgpGc'
      },
      {
        id: '5',
        name: 'Smells Like Teen Spirit',
        artist: 'Nirvana',
        album: 'Nevermind',
        albumArt: 'https://i.scdn.co/image/ab67616d0000b27358261ff5d8c28072dc64475f',
        uri: 'spotify:track:5ghIJDpPoe3CfHMGu71E6T'
      }
    ];
    
    // Simulate API response delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Return all tracks if no query, or filter by query
    if (!query) return mockTracks.slice(0, 3);
    
    const lowerQuery = query.toLowerCase();
    return mockTracks
      .filter(track => 
        track.name.toLowerCase().includes(lowerQuery) || 
        track.artist.toLowerCase().includes(lowerQuery) || 
        track.album.toLowerCase().includes(lowerQuery)
      )
      .slice(0, 5);
  } catch (error) {
    console.error('Error searching Spotify:', error);
    throw new Error('Failed to search Spotify');
  }
};
