
import { JournalEntry, Mood } from '@/types';
import { encryptJournalEntry, decryptJournalEntry } from '@/utils/encryption';

// Helper functions for reading entries
export const getEntryById = (entries: JournalEntry[], id: string): JournalEntry | undefined => {
  return entries.find(entry => entry.id === id);
};

export const getEntriesByDate = (entries: JournalEntry[], date: string): JournalEntry[] => {
  return entries.filter(entry => entry.date === date);
};

export const getEntriesByMood = (entries: JournalEntry[], mood: Mood): JournalEntry[] => {
  return entries.filter(entry => entry.mood === mood);
};

export const searchEntries = (entries: JournalEntry[], query: string): JournalEntry[] => {
  const lowercaseQuery = query.toLowerCase();
  return entries.filter(entry => 
    entry.content.toLowerCase().includes(lowercaseQuery) ||
    (entry.weather?.location.toLowerCase().includes(lowercaseQuery)) ||
    (entry.track?.name?.toLowerCase().includes(lowercaseQuery)) ||
    (entry.track?.artist?.toLowerCase().includes(lowercaseQuery))
  );
};

// Create a new empty entry using the user's local timezone
export const createNewEntry = (date?: string): JournalEntry => {
  const now = new Date();
  
  // Format the date in YYYY-MM-DD format but use local date in the user's timezone
  // Using toLocaleDateString with 'en-CA' locale which produces YYYY-MM-DD format
  const localDate = date || now.toLocaleDateString('en-CA'); 
  
  const newEntry: JournalEntry = {
    id: `temp-${Date.now()}`,
    content: '',
    date: localDate,
    timestamp: now.toISOString(),
    mood: 'neutral',
    createdAt: Date.now(),
    comments: []
  };
  
  console.log(`Creating new entry with date: ${localDate}`);
  return newEntry;
};

// Transform data from database to JournalEntry type
export const transformDatabaseEntryToJournalEntry = (entry: any): JournalEntry => {
  // Create Spotify track object if track data exists
  let track = undefined;
  if (entry.spotify_track_uri) {
    track = {
      id: entry.spotify_track_uri.split(':').pop() || '',
      name: entry.spotify_track_name || '',
      artist: entry.spotify_track_artist || '',
      album: entry.spotify_track_album || '',
      albumArt: entry.spotify_track_image || '',
      uri: entry.spotify_track_uri
    };
  }
  
  // Create the basic entry object
  const journalEntry: JournalEntry = {
    id: entry.id,
    content: entry.entry_text,
    date: new Date(entry.timestamp_started).toISOString().split('T')[0],
    timestamp: entry.timestamp_started,
    mood: entry.mood as Mood,
    weather: entry.weather_temperature ? {
      temperature: entry.weather_temperature,
      description: entry.weather_description || '',
      icon: entry.weather_icon || '',
      location: entry.weather_location || ''
    } : undefined,
    track: track,
    createdAt: new Date(entry.created_at).getTime(),
    updatedAt: entry.updated_at ? new Date(entry.updated_at).getTime() : undefined,
    user_id: entry.user_id,
    comments: [], // Initialize comments array (will be populated during decryption)
    reflectionQuestion: entry.reflection_question || undefined,
    reflectionAnswer: entry.reflection_answer || undefined
  };
  
  return journalEntry;
};

// Transform JournalEntry to database format for insert/update
export const transformEntryForDatabase = (entry: JournalEntry) => {
  return {
    user_id: entry.user_id,
    entry_text: entry.content, 
    mood: entry.mood,
    spotify_track_uri: entry.track?.uri,
    spotify_track_name: entry.track?.name,
    spotify_track_artist: entry.track?.artist,
    spotify_track_album: entry.track?.album,
    spotify_track_image: entry.track?.albumArt,
    weather_temperature: entry.weather?.temperature,
    weather_description: entry.weather?.description,
    weather_icon: entry.weather?.icon,
    weather_location: entry.weather?.location,
    timestamp_started: entry.timestamp,
    reflection_question: entry.reflectionQuestion,
    reflection_answer: entry.reflectionAnswer
  };
};
