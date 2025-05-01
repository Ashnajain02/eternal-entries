
import React, { createContext, useContext, useEffect, useState } from 'react';
import { JournalEntry, Mood, SpotifyTrack, WeatherData } from '@/types';

interface JournalContextType {
  entries: JournalEntry[];
  currentEntry: JournalEntry | null;
  addEntry: (entry: JournalEntry) => void;
  updateEntry: (entry: JournalEntry) => void;
  deleteEntry: (id: string) => void;
  getEntryById: (id: string) => JournalEntry | undefined;
  getEntriesByDate: (date: string) => JournalEntry[];
  getEntriesByMood: (mood: Mood) => JournalEntry[];
  createNewEntry: (date?: string) => JournalEntry;
  setCurrentEntry: (entry: JournalEntry | null) => void;
  searchEntries: (query: string) => JournalEntry[];
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
  
  // Load entries from localStorage on initial render
  useEffect(() => {
    try {
      const savedEntries = localStorage.getItem('journal_entries');
      if (savedEntries) {
        setEntries(JSON.parse(savedEntries));
      }
    } catch (error) {
      console.error('Error loading journal entries:', error);
    }
  }, []);
  
  // Save entries to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('journal_entries', JSON.stringify(entries));
    } catch (error) {
      console.error('Error saving journal entries:', error);
    }
  }, [entries]);
  
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
    
    sortedEntries.forEach(entry => {
      const entryDate = new Date(entry.date);
      
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
  const addEntry = (entry: JournalEntry) => {
    setEntries(prev => [...prev, entry]);
  };
  
  const updateEntry = (updatedEntry: JournalEntry) => {
    setEntries(prev => prev.map(entry => 
      entry.id === updatedEntry.id ? updatedEntry : entry
    ));
  };
  
  const deleteEntry = (id: string) => {
    setEntries(prev => prev.filter(entry => entry.id !== id));
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
      id: `entry-${Date.now()}`,
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
    statsData
  };
  
  return (
    <JournalContext.Provider value={value}>
      {children}
    </JournalContext.Provider>
  );
};
