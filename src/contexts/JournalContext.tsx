import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { JournalEntry, Mood, JournalComment } from '@/types';
import { useAuth } from './AuthContext';
import { supabase } from '@/integrations/supabase/client';

import { encryptJournalEntry, decryptJournalEntry } from '@/utils/encryption';
import { mapDbRowToJournalEntry, buildDbPayload } from '@/utils/journalEntryMapper';
import { getLocalDate, getUtcTimestamp, getUserTimezone } from '@/utils/dateUtils';

interface JournalContextType {
  entries: JournalEntry[];
  currentEntry: JournalEntry | null;
  addEntry: (entry: JournalEntry) => Promise<void>;
  updateEntry: (entry: JournalEntry) => Promise<void>;
  updateEntryContent: (entryId: string, newContent: string) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  getEntryById: (id: string) => JournalEntry | undefined;
  getEntriesByDate: (date: string) => JournalEntry[];
  getEntriesByMood: (mood: Mood) => JournalEntry[];
  createNewEntry: (date?: string) => JournalEntry;
  setCurrentEntry: (entry: JournalEntry | null) => void;
  searchEntries: (query: string) => JournalEntry[];
  addCommentToEntry: (entryId: string, content: string) => Promise<void>;
  deleteCommentFromEntry: (entryId: string, commentId: string) => Promise<void>;
  getRandomEntries: (count: number) => JournalEntry[];
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
  const [isLoading, setIsLoading] = useState(false);
  const { authState } = useAuth();
  const hasLoadedEntriesRef = useRef(false);
  const currentUserIdRef = useRef<string | null>(null);
  
  useEffect(() => {
    const fetchEntries = async () => {
      if (!authState.user) {
        setEntries([]);
        setIsLoading(false);
        hasLoadedEntriesRef.current = false;
        currentUserIdRef.current = null;
        return;
      }

      if (hasLoadedEntriesRef.current && currentUserIdRef.current === authState.user.id) {
        setIsLoading(false);
        return;
      }

      if (currentUserIdRef.current !== authState.user.id) {
        setIsLoading(true);
        
        try {
          const { data, error } = await supabase
            .from('journal_entries')
            .select('*')
            .eq('user_id', authState.user.id)
            .eq('status', 'published')
            .order('timestamp_started', { ascending: false });

          if (error) throw error;

          const transformedEntries: JournalEntry[] = [];
          
          for (const row of data) {
            const journalEntry = mapDbRowToJournalEntry(row);
            const decryptedEntry = await decryptJournalEntry(journalEntry, authState.user.id);
            transformedEntries.push(decryptedEntry);
          }

          setEntries(transformedEntries);
          hasLoadedEntriesRef.current = true;
          currentUserIdRef.current = authState.user.id;
        } catch (error: unknown) {
          console.error('Error loading journal entries:', error instanceof Error ? error.message : 'An unexpected error occurred');
        } finally {
          setIsLoading(false);
        }
      }
    };

    fetchEntries();
  }, [authState.user?.id]);
  
  const statsData = React.useMemo(() => {
    const totalEntries = entries.length;
    
    const moodCounts: Record<Mood, number> = {
      happy: 0, content: 0, neutral: 0, sad: 0, anxious: 0,
      angry: 0, emotional: 0, 'in-love': 0, excited: 0, tired: 0
    };
    
    entries.forEach(entry => {
      if (entry.mood) {
        moodCounts[entry.mood]++;
      }
    });
    
    // Calculate longest streak
    const uniqueDates = [...new Set(entries.map(e => e.date))].sort();
    let longestStreak = 0;
    let currentStreak = 0;
    let lastDate: Date | null = null;
    
    for (const dateStr of uniqueDates) {
      const entryDate = new Date(dateStr);
      
      if (lastDate) {
        const dayDiff = Math.floor((entryDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
        currentStreak = dayDiff === 1 ? currentStreak + 1 : 1;
      } else {
        currentStreak = 1;
      }
      
      longestStreak = Math.max(longestStreak, currentStreak);
      lastDate = entryDate;
    }
    
    // Calculate most common time
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
    
    return { totalEntries, moodCounts, longestStreak, mostCommonTime };
  }, [entries]);

  const getRandomEntries = useCallback((count: number): JournalEntry[] => {
    const today = getLocalDate();
    const pastEntries = entries.filter(e => e.date !== today);
    if (pastEntries.length === 0) return [];
    const shuffled = [...pastEntries].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, shuffled.length));
  }, [entries]);

  const addEntry = async (entry: JournalEntry) => {
    if (!authState.user) {
      return;
    }

    // Entry is already in DB (inserted by publishDraft) - just update local state
    setEntries(prev => {
      const exists = prev.some(e => e.id === entry.id);
      if (exists) {
        return prev.map(e => e.id === entry.id ? entry : e);
      }
      return [entry, ...prev];
    });
  };
  
  const updateEntry = async (updatedEntry: JournalEntry) => {
    if (!authState.user) {
      return;
    }

    try {
      const now = new Date();
      const encryptedEntry = await encryptJournalEntry(updatedEntry, authState.user.id);
      const payload = buildDbPayload(updatedEntry, encryptedEntry.content);
      
      const { error } = await supabase
        .from('journal_entries')
        .update({ ...payload, updated_at: now.toISOString() })
        .eq('id', updatedEntry.id);

      if (error) throw error;

      const updatedEntryWithTimestamp = { ...updatedEntry, updatedAt: now.getTime() };
      
      setEntries(prev => prev.map(entry => 
        entry.id === updatedEntry.id ? updatedEntryWithTimestamp : entry
      ));

    } catch (error: unknown) {
      console.error('Error updating journal entry:', error);
      throw error;
    }
  };

  const updateEntryContent = async (entryId: string, newContent: string) => {
    if (!authState.user) {
      throw new Error('Authentication required');
    }

    const entryToUpdate = entries.find(e => e.id === entryId);
    if (!entryToUpdate) {
      throw new Error('Entry not found');
    }

    try {
      const now = new Date();
      const updatedEntry: JournalEntry = { ...entryToUpdate, content: newContent };
      const encryptedEntry = await encryptJournalEntry(updatedEntry, authState.user.id);
      
      const { error } = await supabase
        .from('journal_entries')
        .update({
          entry_text: encryptedEntry.content,
          updated_at: now.toISOString()
        })
        .eq('id', entryId);

      if (error) throw error;

      setEntries(prev => prev.map(entry => 
        entry.id === entryId ? { ...entry, content: newContent, updatedAt: now.getTime() } : entry
      ));
    } catch (error: unknown) {
      console.error('Error updating entry content:', error);
      throw error;
    }
  };
  
  const deleteEntry = async (id: string) => {
    if (!authState.user) {
      return;
    }

    try {
      const { error } = await supabase
        .from('journal_entries')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setEntries(prev => prev.filter(entry => entry.id !== id));
    } catch (error: unknown) {
      console.error('Error deleting journal entry:', error);
      throw error;
    }
  };
  
  const getEntryById = (id: string) => entries.find(entry => entry.id === id);
  const getEntriesByDate = (date: string) => entries.filter(entry => entry.date === date);
  const getEntriesByMood = (mood: Mood) => entries.filter(entry => entry.mood === mood);
  
  const searchEntries = (query: string) => {
    const lowercaseQuery = query.toLowerCase();
    return entries.filter(entry => 
      entry.content.toLowerCase().includes(lowercaseQuery) ||
      entry.weather?.location?.toLowerCase().includes(lowercaseQuery) ||
      entry.track?.name?.toLowerCase().includes(lowercaseQuery) ||
      entry.track?.artist?.toLowerCase().includes(lowercaseQuery)
    );
  };
  
  const addCommentToEntry = async (entryId: string, content: string) => {
    if (!authState.user) {
      return;
    }

    const entryToUpdate = entries.find(e => e.id === entryId);
    if (!entryToUpdate) {
      throw new Error("Entry not found");
    }

    try {
      const now = new Date();
      const newComment: JournalComment = {
        id: `comment-${Date.now()}`,
        content,
        createdAt: now.getTime()
      };

      const updatedEntry: JournalEntry = {
        ...entryToUpdate,
        comments: [...(entryToUpdate.comments || []), newComment]
      };

      const encryptedEntry = await encryptJournalEntry(updatedEntry, authState.user.id);
      
      const { error } = await supabase
        .from('journal_entries')
        .update({
          entry_text: encryptedEntry.content,
          updated_at: now.toISOString()
        })
        .eq('id', entryId);

      if (error) throw error;

      setEntries(prev => prev.map(entry => 
        entry.id === entryId ? {
          ...entry,
          comments: [...(entry.comments || []), newComment],
          updatedAt: now.getTime()
        } : entry
      ));

    } catch (error: unknown) {
      console.error('Error adding comment:', error);
      throw error;
    }
  };
  
  const deleteCommentFromEntry = async (entryId: string, commentId: string) => {
    if (!authState.user) {
      return;
    }

    const entryToUpdate = entries.find(e => e.id === entryId);
    if (!entryToUpdate) {
      throw new Error("Entry not found");
    }

    try {
      const updatedComments = (entryToUpdate.comments || []).filter(c => c.id !== commentId);
      const updatedEntry: JournalEntry = { ...entryToUpdate, comments: updatedComments };

      const encryptedEntry = await encryptJournalEntry(updatedEntry, authState.user.id);
      
      const now = new Date();
      const { error } = await supabase
        .from('journal_entries')
        .update({
          entry_text: encryptedEntry.content,
          updated_at: now.toISOString()
        })
        .eq('id', entryId);

      if (error) throw error;

      setEntries(prev => prev.map(entry => 
        entry.id === entryId ? { ...entry, comments: updatedComments, updatedAt: now.getTime() } : entry
      ));

    } catch (error: unknown) {
      console.error('Error deleting comment:', error);
      throw error;
    }
  };
  
  const createNewEntry = (date?: string) => {
    const newEntry: JournalEntry = {
      id: `temp-${Date.now()}`,
      content: '',
      date: date || getLocalDate(),
      timestamp: getUtcTimestamp(),
      timezone: getUserTimezone(),
      mood: 'neutral',
      createdAt: Date.now(),
      comments: []
    };

    return newEntry;
  };
  
  const value = React.useMemo(() => ({
    entries,
    currentEntry,
    addEntry,
    updateEntry,
    updateEntryContent,
    deleteEntry,
    getEntryById,
    getEntriesByDate,
    getEntriesByMood,
    createNewEntry,
    setCurrentEntry,
    searchEntries,
    addCommentToEntry,
    deleteCommentFromEntry,
    getRandomEntries,
    isLoading,
    statsData
  }), [entries, currentEntry, isLoading, statsData]);

  return (
    <JournalContext.Provider value={value}>
      {children}
    </JournalContext.Provider>
  );
};
