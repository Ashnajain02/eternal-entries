
import { useState, useEffect, useCallback, useRef } from 'react';
import { JournalEntry } from '@/types';
import { useToast } from '@/hooks/use-toast';

// Key used for local storage of draft entries
const DRAFT_STORAGE_KEY = 'journal_draft_entry';

export function useJournalDraft(initialEntry?: JournalEntry, createNewEntry?: () => JournalEntry) {
  const { toast } = useToast();
  const [lastAutoSave, setLastAutoSave] = useState<Date | null>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasBeenSavedRef = useRef(false);
  const isNewEntryRef = useRef(false);
  
  // Make sure we use the correct current date when creating a new entry
  const [entry, setEntry] = useState<JournalEntry>(() => {
    if (initialEntry) {
      // This is an existing entry being edited
      isNewEntryRef.current = false;
      return initialEntry;
    }
    
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
            isNewEntryRef.current = true;
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
    isNewEntryRef.current = true;
    return createNewEntry ? createNewEntry() : initialEntry as JournalEntry;
  });
  
  const saveDraft = useCallback((updatedEntry: JournalEntry) => {
    // Only save drafts for new entries, not existing ones being edited
    if (!isNewEntryRef.current) {
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
  }, []);

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
  
  // Clear draft when unmounting only in specific cases
  useEffect(() => {
    return () => {
      // Clear any pending auto-save timeout
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
      
      // Only clear the draft if:
      // 1. The entry has been properly saved (hasBeenSavedRef is true), OR
      // 2. The entry has no content AND it's a new entry
      const currentContent = entry.content?.trim() || '';
      const shouldClearDraft = hasBeenSavedRef.current || (!currentContent && isNewEntryRef.current);
      
      if (shouldClearDraft) {
        localStorage.removeItem(DRAFT_STORAGE_KEY);
        console.log("Cleared draft entry on component unmount");
      } else {
        console.log("Preserving draft entry on component unmount - content exists");
      }
    };
  }, []); // Empty dependency array - we want this to run with the latest values

  const clearDraft = useCallback(() => {
    // Clear timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    
    // Mark as saved so cleanup doesn't preserve it
    hasBeenSavedRef.current = true;
    
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

  // Mark draft as saved when entry is successfully saved
  const markAsSaved = useCallback(() => {
    hasBeenSavedRef.current = true;
  }, []);
  
  return { 
    entry, 
    setEntry, 
    saveDraft: debouncedSaveDraft,
    saveImmediately,
    clearDraft,
    markAsSaved,
    lastAutoSave
  };
}
