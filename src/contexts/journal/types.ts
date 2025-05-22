
import { JournalEntry, Mood, SpotifyTrack, WeatherData, JournalComment } from '@/types';

export interface JournalContextType {
  entries: JournalEntry[];
  currentEntry: JournalEntry | null;
  addEntry: (entry: JournalEntry) => Promise<void>;
  updateEntry: (entry: JournalEntry) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  getEntryById: (id: string) => JournalEntry | undefined;
  getEntriesByDate: (date: string) => JournalEntry[];
  getEntriesByMood: (mood: Mood) => JournalEntry[];
  createNewEntry: (date?: string) => JournalEntry;
  setCurrentEntry: (entry: JournalEntry | null) => void;
  searchEntries: (query: string) => JournalEntry[];
  addCommentToEntry: (entryId: string, content: string) => Promise<void>;
  deleteCommentFromEntry: (entryId: string, commentId: string) => Promise<void>;
  isLoading: boolean;
  statsData: {
    totalEntries: number;
    moodCounts: Record<Mood, number>;
    longestStreak: number;
    mostCommonTime: string | null;
  };
}
