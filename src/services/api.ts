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
    
    // These are very simplified and just for demonstration
    // New York City approximate coordinates
    if (lat > 40 && lat < 41 && lon > -74.5 && lon < -73.5) {
      return "New York City, NY";
    }
    // United States approximate regions
    else if (lat > 35 && lat < 42 && lon > -124 && lon < -115) {
      return "San Francisco, CA";
    } else if (lat > 33 && lat < 35 && lon > -119 && lon < -116) {
      return "Los Angeles, CA";
    } else if (lat > 36 && lat < 39 && lon > -123 && lon < -120) {
      return "San Jose, CA";
    } else if (lat > 29 && lat < 31 && lon > -98 && lon < -95) {
      return "Houston, TX";
    } else if (lat > 39 && lat < 42 && lon > -89 && lon < -87) {
      return "Chicago, IL";
    } else if (lat > 32 && lat < 34 && lon > -113 && lon < -111) {
      return "Phoenix, AZ";
    } else if (lat > 29 && lat < 33 && lon > -99 && lon < -95) {
      return "Austin, TX";
    } else if (lat > 47 && lat < 48 && lon > -123 && lon < -121) {
      return "Seattle, WA";
    }
    
    // Create a deterministic but varied city name based on the coordinates for other regions
    const cities = [
      'San Francisco', 'New York', 'Los Angeles', 'Chicago', 'Seattle', 
      'Boston', 'Austin', 'Miami', 'Denver', 'Portland',
      'San Jose', 'Atlanta', 'Dallas', 'Houston', 'Phoenix'
    ];
    
    const states = [
      'CA', 'NY', 'TX', 'IL', 'WA', 
      'MA', 'OR', 'FL', 'CO', 'GA'
    ];
    
    const cityIndex = Math.floor(Math.abs(lat * 10) % cities.length);
    const stateIndex = Math.floor(Math.abs(lon * 10) % states.length);
    
    // Return in format "City, State"
    return `${cities[cityIndex]}, ${states[stateIndex]}`;
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
