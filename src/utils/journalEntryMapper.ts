import { JournalEntry, Mood, SpotifyTrack, WeatherData } from '@/types';

/**
 * Database row type from journal_entries table
 */
interface JournalEntryRow {
  id: string;
  user_id: string;
  entry_text: string;
  mood: string;
  status: string;
  timestamp_started: string;
  created_at: string;
  updated_at: string | null;
  spotify_track_uri: string | null;
  spotify_track_name: string | null;
  spotify_track_artist: string | null;
  spotify_track_album: string | null;
  spotify_track_image: string | null;
  spotify_clip_start_seconds: number | null;
  spotify_clip_end_seconds: number | null;
  weather_temperature: number | null;
  weather_description: string | null;
  weather_icon: string | null;
  weather_location: string | null;
  reflection_question: string | null;
  reflection_answer: string | null;
}

/**
 * Maps a Spotify track from database columns to a SpotifyTrack object
 */
function mapSpotifyTrack(row: JournalEntryRow): SpotifyTrack | undefined {
  if (!row.spotify_track_uri) return undefined;
  
  return {
    id: row.spotify_track_uri.split(':').pop() || '',
    name: row.spotify_track_name || '',
    artist: row.spotify_track_artist || '',
    album: row.spotify_track_album || '',
    albumArt: row.spotify_track_image || '',
    uri: row.spotify_track_uri,
    clipStartSeconds: row.spotify_clip_start_seconds ?? 0,
    clipEndSeconds: row.spotify_clip_end_seconds ?? 30
  };
}

/**
 * Maps weather data from database columns to a WeatherData object
 */
function mapWeatherData(row: JournalEntryRow): WeatherData | undefined {
  if (row.weather_temperature === null) return undefined;
  
  return {
    temperature: row.weather_temperature,
    description: row.weather_description || '',
    icon: row.weather_icon || '',
    location: row.weather_location || ''
  };
}

/**
 * Maps a database row to a JournalEntry object
 */
export function mapDbRowToJournalEntry(row: JournalEntryRow): JournalEntry {
  return {
    id: row.id,
    content: row.entry_text,
    date: new Date(row.timestamp_started).toISOString().split('T')[0],
    timestamp: row.timestamp_started,
    mood: row.mood as Mood,
    weather: mapWeatherData(row),
    track: mapSpotifyTrack(row),
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : undefined,
    user_id: row.user_id,
    comments: [],
    reflectionQuestion: row.reflection_question || undefined,
    reflectionAnswer: row.reflection_answer || undefined
  };
}

/**
 * Builds the database update/insert payload from a JournalEntry
 */
export function buildDbPayload(entry: JournalEntry, encryptedContent: string) {
  return {
    entry_text: encryptedContent,
    mood: entry.mood,
    spotify_track_uri: entry.track?.uri || null,
    spotify_track_name: entry.track?.name || null,
    spotify_track_artist: entry.track?.artist || null,
    spotify_track_album: entry.track?.album || null,
    spotify_track_image: entry.track?.albumArt || null,
    spotify_clip_start_seconds: entry.track?.clipStartSeconds ?? null,
    spotify_clip_end_seconds: entry.track?.clipEndSeconds ?? null,
    weather_temperature: entry.weather?.temperature ?? null,
    weather_description: entry.weather?.description || null,
    weather_icon: entry.weather?.icon || null,
    weather_location: entry.weather?.location || null
  };
}

/**
 * Strips HTML tags from content to get plain text
 */
export function getPlainTextContent(htmlContent: string): string {
  return htmlContent?.replace(/<[^>]*>/g, '').trim() || '';
}

/**
 * Checks if an entry has meaningful content worth saving
 */
export function hasMeaningfulContent(entry: JournalEntry): boolean {
  const textContent = getPlainTextContent(entry.content);
  return !!(textContent || entry.track || entry.mood !== 'neutral');
}
