
import React, { createContext, useContext, useEffect, useState } from 'react';
import { JournalEntry, Mood, SpotifyTrack, WeatherData } from '@/types';
import { useAuth } from './AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface JournalContextType {
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
  isLoading: boolean;
  statsData: {
    totalEntries: number;
    moodCounts: Record<Mood, number>;
    longestStreak: number;
    mostCommonTime: string | null;
  };
}

const JournalContext = createContext<JournalContextType | undefined>(undefined);

export const useJournal = () => {
  const context = useContext(JournalContext);
  if (!context) {
    throw new Error('useJournal must be used within a JournalProvider');
  }
  return context;
};

interface JournalProviderProps {
  children: React.ReactNode;
}

export const JournalProvider = ({ children }: JournalProviderProps) => {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [currentEntry, setCurrentEntry] = useState<JournalEntry | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { authState } = useAuth();
  const { toast } = useToast();
  
  // Load entries from Supabase on auth state change
  useEffect(() => {
    const fetchEntries = async () => {
      if (!authState.user) {
        setEntries([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('journal_entries')
          .select('*')
          .eq('user_id', authState.user.id)
          .order('timestamp_started', { ascending: false });

        if (error) throw error;

        // Transform the data to match our client-side model
        const transformedEntries: JournalEntry[] = data.map(entry => ({
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
          track: entry.spotify_track_uri ? {
            id: entry.spotify_track_uri,
            name: entry.spotify_track_name || '',
            artist: entry.spotify_track_artist || '',
            album: entry.spotify_track_album || '',
            albumArt: entry.spotify_track_image || '',
            uri: entry.spotify_track_uri
          } : undefined,
          createdAt: new Date(entry.created_at).getTime(),
          updatedAt: entry.updated_at ? new Date(entry.updated_at).getTime() : undefined
        }));

        setEntries(transformedEntries);
      } catch (error: any) {
        console.error('Error loading journal entries:', error.message);
        toast({
          title: "Error loading journal entries",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchEntries();
  }, [authState.user]);
  
  // Generate stats data
  const statsData = React.useMemo(() => {
    // Calculate total entries
    const totalEntries = entries.length;
    
    // Calculate mood counts
    const moodCounts: Record<Mood, number> = {
      happy: 0,
      content: 0,
      neutral: 0,
      sad: 0,
      anxious: 0
    };
    
    entries.forEach(entry => {
      if (entry.mood) {
        moodCounts[entry.mood]++;
      }
    });
    
    // Calculate longest streak (consecutive days)
    let longestStreak = 0;
    let currentStreak = 0;
    let lastDate: Date | null = null;
    
    // Sort entries by date
    const sortedEntries = [...entries].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    
    // Get unique dates
    const uniqueDates = new Set(sortedEntries.map(entry => entry.date));
    const uniqueSortedDates = Array.from(uniqueDates).sort();
    
    uniqueSortedDates.forEach((dateStr, index) => {
      const entryDate = new Date(dateStr);
      
      if (lastDate) {
        // Check if this entry is one day after the last one
        const dayDiff = Math.floor(
          (entryDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        
        if (dayDiff === 1) {
          currentStreak++;
        } else if (dayDiff > 1) {
          // Reset streak if there's a gap
          currentStreak = 1;
        }
      } else {
        // First entry
        currentStreak = 1;
      }
      
      // Update longest streak if needed
      longestStreak = Math.max(longestStreak, currentStreak);
      lastDate = entryDate;
    });
    
    // Calculate most common journaling time
    const hourCounts: Record<number, number> = {};
    entries.forEach(entry => {
      if (entry.timestamp) {
        const hour = new Date(entry.timestamp).getHours();
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      }
    });
    
    let mostCommonHour = -1;
    let maxCount = 0;
    
    Object.entries(hourCounts).forEach(([hour, count]) => {
      if (count > maxCount) {
        mostCommonHour = parseInt(hour);
        maxCount = count;
      }
    });
    
    const mostCommonTime = mostCommonHour >= 0
      ? `${mostCommonHour % 12 || 12}${mostCommonHour >= 12 ? 'PM' : 'AM'}`
      : null;
    
    return {
      totalEntries,
      moodCounts,
      longestStreak,
      mostCommonTime
    };
  }, [entries]);
  
  // Helper functions
  const addEntry = async (entry: JournalEntry) => {
    if (!authState.user) {
      toast({
        title: "Authentication required",
        description: "You must be logged in to add journal entries",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('journal_entries')
        .insert([{
          user_id: authState.user.id,
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
          timestamp_started: entry.timestamp
        }])
        .select()
        .single();

      if (error) throw error;

      // Add the entry to the local state with the server-generated ID
      const newEntry: JournalEntry = {
        ...entry,
        id: data.id,
        createdAt: new Date(data.created_at).getTime(),
      };

      setEntries(prev => [newEntry, ...prev]);

      toast({
        title: "Entry saved",
        description: "Your journal entry has been saved successfully",
      });
    } catch (error: any) {
      console.error('Error adding journal entry:', error);
      toast({
        title: "Error saving entry",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };
  
  const updateEntry = async (updatedEntry: JournalEntry) => {
    if (!authState.user) {
      toast({
        title: "Authentication required",
        description: "You must be logged in to update journal entries",
        variant: "destructive",
      });
      return;
    }

    try {
      // Add the current timestamp as updated_at
      const now = new Date();
      
      const { error } = await supabase
        .from('journal_entries')
        .update({
          entry_text: updatedEntry.content,
          mood: updatedEntry.mood,
          spotify_track_uri: updatedEntry.track?.uri,
          spotify_track_name: updatedEntry.track?.name,
          spotify_track_artist: updatedEntry.track?.artist,
          spotify_track_album: updatedEntry.track?.album,
          spotify_track_image: updatedEntry.track?.albumArt,
          weather_temperature: updatedEntry.weather?.temperature,
          weather_description: updatedEntry.weather?.description,
          weather_icon: updatedEntry.weather?.icon,
          weather_location: updatedEntry.weather?.location,
          updated_at: now.toISOString() // Add the updated_at timestamp
        })
        .eq('id', updatedEntry.id);

      if (error) throw error;

      // Update the entry with the new updated_at timestamp
      const updatedEntryWithTimestamp = {
        ...updatedEntry,
        updatedAt: now.getTime()
      };
      
      setEntries(prev => prev.map(entry => 
        entry.id === updatedEntry.id ? updatedEntryWithTimestamp : entry
      ));

      toast({
        title: "Entry updated",
        description: "Your journal entry has been updated successfully",
      });
    } catch (error: any) {
      console.error('Error updating journal entry:', error);
      toast({
        title: "Error updating entry",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };
  
  const deleteEntry = async (id: string) => {
    if (!authState.user) {
      toast({
        title: "Authentication required",
        description: "You must be logged in to delete journal entries",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('journal_entries')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setEntries(prev => prev.filter(entry => entry.id !== id));

      toast({
        title: "Entry deleted",
        description: "Your journal entry has been deleted successfully",
      });
    } catch (error: any) {
      console.error('Error deleting journal entry:', error);
      toast({
        title: "Error deleting entry",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };
  
  const getEntryById = (id: string) => {
    return entries.find(entry => entry.id === id);
  };
  
  const getEntriesByDate = (date: string) => {
    return entries.filter(entry => entry.date === date);
  };
  
  const getEntriesByMood = (mood: Mood) => {
    return entries.filter(entry => entry.mood === mood);
  };
  
  const searchEntries = (query: string) => {
    const lowercaseQuery = query.toLowerCase();
    return entries.filter(entry => 
      entry.content.toLowerCase().includes(lowercaseQuery) ||
      (entry.weather?.location.toLowerCase().includes(lowercaseQuery)) ||
      (entry.track?.name.toLowerCase().includes(lowercaseQuery)) ||
      (entry.track?.artist.toLowerCase().includes(lowercaseQuery))
    );
  };
  
  // Create a new empty entry
  const createNewEntry = (date?: string) => {
    const now = new Date();
    const formattedDate = date || now.toISOString().split('T')[0];
    
    const newEntry: JournalEntry = {
      id: `temp-${Date.now()}`,
      content: '',
      date: formattedDate,
      timestamp: now.toISOString(),
      mood: 'neutral',
      createdAt: Date.now()
    };
    
    return newEntry;
  };
  
  const value = {
    entries,
    currentEntry,
    addEntry,
    updateEntry,
    deleteEntry,
    getEntryById,
    getEntriesByDate,
    getEntriesByMood,
    createNewEntry,
    setCurrentEntry,
    searchEntries,
    isLoading,
    statsData
  };
  
  return (
    <JournalContext.Provider value={value}>
      {children}
    </JournalContext.Provider>
  );
};
