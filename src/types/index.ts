
export type Mood = 'happy' | 'content' | 'neutral' | 'sad' | 'anxious' | 'angry' | 'emotional' | 'in-love' | 'excited' | 'tired';

export interface MoodOption {
  value: Mood;
  label: string;
  emoji: string;
}

export type TemperatureUnit = 'celsius' | 'fahrenheit';

export interface WeatherData {
  temperature: number;
  description: string;
  icon: string;
  location: string;
}

export interface SpotifyTrack {
  id: string;
  name: string;
  artist: string;
  album: string;
  albumArt: string;
  uri: string;
}

export interface JournalComment {
  id: string;
  content: string;
  createdAt: number;
  updatedAt?: number;
}

export interface JournalEntry {
  id: string;
  content: string;
  date: string;
  timestamp: string;
  mood: Mood;
  weather?: WeatherData;
  track?: SpotifyTrack;
  createdAt: number;
  updatedAt?: number;
  user_id?: string;
  comments?: JournalComment[];
  ai_prompt?: string | null;
  ai_response?: string | null;
}
