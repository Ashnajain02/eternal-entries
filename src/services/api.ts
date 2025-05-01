
import { SpotifyTrack, WeatherData } from "@/types";

// Simulate weather API call
export const fetchWeatherData = async (lat: number, lon: number): Promise<WeatherData> => {
  try {
    console.log(`Fetching weather data for coordinates: ${lat}, ${lon}`);
    
    // In a real application, this would be an actual API call
    // For example: 
    // const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`);
    // const data = await response.json();
    
    // For now, we'll simulate a successful response
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
    
    const randomDescription = descriptions[Math.floor(Math.random() * descriptions.length)];
    const randomIcon = weatherIcons[Math.floor(Math.random() * weatherIcons.length)];
    const randomTemp = Math.floor(Math.random() * 30) + 5; // Random temperature between 5-35°C
    
    // Simulate geolocation reverse lookup for city name
    const cities = ['New York', 'London', 'Tokyo', 'Paris', 'Sydney', 'Berlin', 'Toronto'];
    const randomCity = cities[Math.floor(Math.random() * cities.length)];
    
    return {
      temperature: randomTemp,
      description: randomDescription,
      icon: randomIcon,
      location: randomCity
    };
  } catch (error) {
    console.error('Error fetching weather data:', error);
    throw new Error('Failed to fetch weather data');
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
