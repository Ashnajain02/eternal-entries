
import { useState, useEffect, useCallback, useRef } from 'react';
import { JournalEntry } from '@/types';
import { useToast } from '@/hooks/use-toast';

// Key used for local storage of draft entries
const DRAFT_STORAGE_KEY = 'journal_draft_entry';

export function useJournalDraft(initialEntry?: JournalEntry, createNewEntry?: () => JournalEntry) {
  const { toast } = useToast();
  const [lastAutoSave, setLastAutoSave] = useState<Date | null>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Make sure we use the correct current date when creating a new entry
  const [entry, setEntry] = useState<JournalEntry>(() => {
    if (initialEntry) return initialEntry;
    
    // Check if there's a saved draft in localStorage
    const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (savedDraft && createNewEntry) {
      try {
        const parsedDraft = JSON.parse(savedDraft);
        // Verify this is a valid journal entry object and not expired
        if (parsedDraft && parsedDraft.content && parsedDraft.date) {
          // Get today's date in YYYY-MM-DD format in the user's local timezone
          const today = new Date().toLocaleDateString('en-CA'); // en-CA produces YYYY-MM-DD format
          
          if (parsedDraft.date === today) {
            console.log("Draft restored from localStorage");
            toast({
              title: "Draft restored",
              description: "Your unsaved journal entry has been restored."
            });
            return parsedDraft;
          }
        }
      } catch (e) {
        console.error("Error parsing saved draft:", e);
        // Clear invalid draft
        localStorage.removeItem(DRAFT_STORAGE_KEY);
      }
    }
    
    // Create a new entry with the current date
    return createNewEntry ? createNewEntry() : initialEntry as JournalEntry;
  });
  
  const saveDraft = useCallback((updatedEntry: JournalEntry) => {
    // Don't auto-save if this is an existing entry that's being edited
    if (initialEntry && initialEntry.id && !initialEntry.id.startsWith('temp-')) {
      return;
    }
    
    // Only save if there's content
    if (!updatedEntry.content.trim()) {
      return;
    }
    
    try {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(updatedEntry));
      setLastAutoSave(new Date());
      console.log("Auto-saved draft entry to localStorage");
    } catch (e) {
      console.error("Error saving draft to localStorage:", e);
    }
  }, [initialEntry]);

  // Debounced auto-save function
  const debouncedSaveDraft = useCallback((updatedEntry: JournalEntry) => {
    // Clear existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    
    // Set new timeout for 2.5 seconds after last change
    autoSaveTimeoutRef.current = setTimeout(() => {
      saveDraft(updatedEntry);
    }, 2500);
  }, [saveDraft]);
  
  // Clear draft when unmounting if needed
  useEffect(() => {
    return () => {
      // Clear any pending auto-save timeout
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
      
      // We only want to clear the draft when navigating away if we've properly saved the entry
      const shouldClearDraft = !entry.content.trim() || (initialEntry && !initialEntry.id?.startsWith('temp-'));
      
      if (shouldClearDraft) {
        localStorage.removeItem(DRAFT_STORAGE_KEY);
        console.log("Cleared draft entry on component unmount");
      }
    };
  }, [entry.content, initialEntry]);

  const clearDraft = useCallback(() => {
    // Clear timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    
    localStorage.removeItem(DRAFT_STORAGE_KEY);
    console.log("Cleared draft entry manually");
  }, []);

  // Immediate save function for critical changes
  const saveImmediately = useCallback((updatedEntry: JournalEntry) => {
    // Clear any pending debounced save
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    
    saveDraft(updatedEntry);
  }, [saveDraft]);
  
  return { 
    entry, 
    setEntry, 
    saveDraft: debouncedSaveDraft,
    saveImmediately,
    clearDraft,
    lastAutoSave
  };
}
