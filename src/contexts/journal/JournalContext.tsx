
import React, { createContext, useContext, useEffect, useState } from 'react';
import { JournalEntry, Mood } from '@/types';
import { useAuth } from '../AuthContext';
import { useToast } from '@/hooks/use-toast';
import { JournalService } from './JournalService';
import { JournalContextType } from './types';
import { useJournalStats } from './useJournalStats';
import { 
  getEntryById, 
  getEntriesByDate, 
  getEntriesByMood, 
  searchEntries,
  createNewEntry
} from './journalHelpers';

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
  
  // Calculate stats from entries
  const statsData = useJournalStats(entries);
  
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
        const journalEntries = await JournalService.fetchEntries(authState.user.id);
        setEntries(journalEntries);
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
  }, [authState.user, toast]);
  
  // CRUD operations for entries
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
      const newEntry = await JournalService.addEntry(entry, authState.user.id);
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
      await JournalService.updateEntry(updatedEntry, authState.user.id);
      
      // Update local state with the new updated_at timestamp
      const now = new Date();
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
      await JournalService.deleteEntry(id);
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
      // Find the entry to update
      const entryToUpdate = entries.find(e => e.id === entryId);
      
      if (!entryToUpdate) {
        throw new Error("Entry not found");
      }

      // Create a new comment object
      const now = new Date();
      const newComment = {
        id: `comment-${Date.now()}`,
        content,
        createdAt: now.getTime()
      };

      await JournalService.addCommentToEntry(entryToUpdate, content, authState.user.id);

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

      await JournalService.deleteCommentFromEntry(entryToUpdate, commentId, authState.user.id);

      // Update local state
      const updatedComments = (entryToUpdate.comments || []).filter(
        comment => comment.id !== commentId
      );
      
      setEntries(prev => prev.map(entry => 
        entry.id === entryId ? {
          ...entry,
          comments: updatedComments,
          updatedAt: Date.now()
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
  
  const value = {
    entries,
    currentEntry,
    addEntry,
    updateEntry,
    deleteEntry,
    getEntryById: (id: string) => getEntryById(entries, id),
    getEntriesByDate: (date: string) => getEntriesByDate(entries, date),
    getEntriesByMood: (mood: Mood) => getEntriesByMood(entries, mood),
    createNewEntry,
    setCurrentEntry,
    searchEntries: (query: string) => searchEntries(entries, query),
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
