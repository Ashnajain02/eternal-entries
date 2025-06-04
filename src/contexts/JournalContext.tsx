import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { JournalEntry, Mood, SpotifyTrack, WeatherData, JournalComment } from '@/types';
import { useAuth } from './AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { encryptJournalEntry, decryptJournalEntry, encryptText, decryptText } from '@/utils/encryption';

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
  const hasLoadedEntriesRef = useRef(false);
  const currentUserIdRef = useRef<string | null>(null);
  
  // Load entries from Supabase only when necessary
  useEffect(() => {
    const fetchEntries = async () => {
      // Don't fetch if no user
      if (!authState.user) {
        setEntries([]);
        setIsLoading(false);
        hasLoadedEntriesRef.current = false;
        currentUserIdRef.current = null;
        return;
      }

      // Don't fetch if we already have entries for this user
      if (hasLoadedEntriesRef.current && currentUserIdRef.current === authState.user.id) {
        setIsLoading(false);
        return;
      }

      // Only fetch if user changed or we haven't loaded entries yet
      if (currentUserIdRef.current !== authState.user.id) {
        setIsLoading(true);
        
        try {
          const { data, error } = await supabase
            .from('journal_entries')
            .select('*')
            .eq('user_id', authState.user.id)
            .order('timestamp_started', { ascending: false });

          if (error) throw error;

          // Transform and decrypt the data
          const transformedEntries: JournalEntry[] = [];
          
          for (const entry of data) {
            // Create Spotify track object if track data exists
            let track: SpotifyTrack | undefined = undefined;
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
            
            // Decrypt the content
            const decryptedEntry = await decryptJournalEntry(journalEntry, authState.user.id);
            transformedEntries.push(decryptedEntry);
          }

          console.log("Loaded entries with tracks:", transformedEntries.filter(e => e.track).length);
          setEntries(transformedEntries);
          hasLoadedEntriesRef.current = true;
          currentUserIdRef.current = authState.user.id;
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
      }
    };

    fetchEntries();
  }, [authState.user?.id, authState.loading]); // Only depend on user ID and loading state
  
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
      anxious: 0,
      angry: 0,
      emotional: 0,
      'in-love': 0,
      excited: 0,
      tired: 0
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
      console.log("Adding entry with track:", entry.track);
      
      // Encrypt the entry content before saving to database
      const encryptedEntry = await encryptJournalEntry(entry, authState.user.id);
      
      const { data, error } = await supabase
        .from('journal_entries')
        .insert([{
          user_id: authState.user.id,
          entry_text: encryptedEntry.content, // Save encrypted content
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

      // Add the decrypted entry to the local state with the server-generated ID
      const newEntry: JournalEntry = {
        ...entry, // Use the original unencrypted entry for local state
        id: data.id,
        createdAt: new Date(data.created_at).getTime(),
      };

      setEntries(prev => [newEntry, ...prev]);

      toast({
        title: "Entry saved",
        description: "Your journal entry has been securely saved",
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
      console.log("Updating entry with track:", updatedEntry.track);
      
      // Add the current timestamp as updated_at
      const now = new Date();
      
      // Encrypt content before saving to database
      const encryptedEntry = await encryptJournalEntry(updatedEntry, authState.user.id);
      
      const { error } = await supabase
        .from('journal_entries')
        .update({
          entry_text: encryptedEntry.content, // Save encrypted content
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
      // Use the unencrypted entry for local state
      const updatedEntryWithTimestamp = {
        ...updatedEntry,
        updatedAt: now.getTime()
      };
      
      setEntries(prev => prev.map(entry => 
        entry.id === updatedEntry.id ? updatedEntryWithTimestamp : entry
      ));

      toast({
        title: "Entry updated",
        description: "Your journal entry has been securely updated",
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
      (entry.track?.name?.toLowerCase().includes(lowercaseQuery)) ||
      (entry.track?.artist?.toLowerCase().includes(lowercaseQuery))
    );
  };
  
  // Add a comment to an entry
  const addCommentToEntry = async (entryId: string, content: string) => {
    if (!authState.user) {
      toast({
        title: "Authentication required",
        description: "You must be logged in to add comments",
        variant: "destructive",
      });
      return;
    }

    try {
      // Create a new comment object
      const now = new Date();
      const newComment: JournalComment = {
        id: `comment-${Date.now()}`,
        content,
        createdAt: now.getTime()
      };

      // Find the entry to update
      const entryToUpdate = entries.find(e => e.id === entryId);
      
      if (!entryToUpdate) {
        throw new Error("Entry not found");
      }

      // Add the comment to the entry
      const updatedEntry: JournalEntry = {
        ...entryToUpdate,
        comments: [...(entryToUpdate.comments || []), newComment]
      };

      // Encrypt the updated entry before saving
      const encryptedEntry = await encryptJournalEntry(updatedEntry, authState.user.id);
      
      // Update the entry in the database
      const { error } = await supabase
        .from('journal_entries')
        .update({
          entry_text: encryptedEntry.content,
          updated_at: now.toISOString()
        })
        .eq('id', entryId);

      if (error) throw error;

      // Update local state
      setEntries(prev => prev.map(entry => 
        entry.id === entryId ? {
          ...entry,
          comments: [...(entry.comments || []), newComment],
          updatedAt: now.getTime()
        } : entry
      ));

      toast({
        title: "Comment added",
        description: "Your note has been added to this journal entry"
      });
    } catch (error: any) {
      console.error('Error adding comment:', error);
      toast({
        title: "Error adding comment",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };
  
  // Delete a comment from an entry
  const deleteCommentFromEntry = async (entryId: string, commentId: string) => {
    if (!authState.user) {
      toast({
        title: "Authentication required",
        description: "You must be logged in to delete comments",
        variant: "destructive",
      });
      return;
    }

    try {
      // Find the entry to update
      const entryToUpdate = entries.find(e => e.id === entryId);
      
      if (!entryToUpdate) {
        throw new Error("Entry not found");
      }

      // Filter out the comment to delete
      const updatedComments = (entryToUpdate.comments || []).filter(
        comment => comment.id !== commentId
      );

      // Update the entry with the filtered comments
      const updatedEntry: JournalEntry = {
        ...entryToUpdate,
        comments: updatedComments
      };

      // Encrypt the updated entry before saving
      const encryptedEntry = await encryptJournalEntry(updatedEntry, authState.user.id);
      
      // Update the entry in the database
      const now = new Date();
      const { error } = await supabase
        .from('journal_entries')
        .update({
          entry_text: encryptedEntry.content,
          updated_at: now.toISOString()
        })
        .eq('id', entryId);

      if (error) throw error;

      // Update local state
      setEntries(prev => prev.map(entry => 
        entry.id === entryId ? {
          ...entry,
          comments: updatedComments,
          updatedAt: now.getTime()
        } : entry
      ));

      toast({
        title: "Note deleted",
        description: "Your note has been deleted successfully"
      });
    } catch (error: any) {
      console.error('Error deleting comment:', error);
      toast({
        title: "Error deleting note",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };
  
  // Create a new empty entry using the user's local timezone
  const createNewEntry = (date?: string) => {
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
    addCommentToEntry,
    deleteCommentFromEntry,
    isLoading,
    statsData
  };
  
  return (
    <JournalContext.Provider value={value}>
      {children}
    </JournalContext.Provider>
  );
};
