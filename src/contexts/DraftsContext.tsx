import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { JournalEntry } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { encryptJournalEntry, decryptJournalEntry } from '@/utils/encryption';

interface DraftsContextType {
  drafts: JournalEntry[];
  isLoadingDrafts: boolean;
  currentDraft: JournalEntry | null;
  saveDraft: (entry: JournalEntry) => Promise<string | null>;
  deleteDraft: (draftId: string) => Promise<void>;
  publishDraft: (entry: JournalEntry, addToContext: (entry: JournalEntry) => Promise<void>) => Promise<void>;
  loadDraft: (draftId: string) => void;
  clearCurrentDraft: () => void;
  createNewDraft: () => JournalEntry;
  autoSaveDraft: (entry: JournalEntry, onIdChanged?: (newId: string) => void) => void;
  lastAutoSave: Date | null;
  reloadDrafts: () => void;
}

const DraftsContext = createContext<DraftsContextType | undefined>(undefined);

export function useDrafts(): DraftsContextType {
  const context = useContext(DraftsContext);
  if (!context) {
    throw new Error('useDrafts must be used within a DraftsProvider');
  }
  return context;
}

export function DraftsProvider({ children }: { children: React.ReactNode }) {
  const { authState } = useAuth();
  const { toast } = useToast();
  const [drafts, setDrafts] = useState<JournalEntry[]>([]);
  const [isLoadingDrafts, setIsLoadingDrafts] = useState(false);
  const [currentDraft, setCurrentDraft] = useState<JournalEntry | null>(null);
  const [lastAutoSave, setLastAutoSave] = useState<Date | null>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentDraftIdRef = useRef<string | null>(null);

  // Map temp IDs to real DB IDs (survives across component lifecycle but not page refresh)
  const tempIdToRealIdRef = useRef<Record<string, string>>({});

  // Load drafts from database
  const loadDrafts = useCallback(async () => {
    if (!authState.user) return;
    
    setIsLoadingDrafts(true);
    try {
      const { data, error } = await supabase
        .from('journal_entries')
        .select('*')
        .eq('user_id', authState.user.id)
        .eq('status', 'draft')
        .order('updated_at', { ascending: false, nullsFirst: false });

      if (error) throw error;

      const decryptedDrafts: JournalEntry[] = [];
      for (const entry of data || []) {
        const journalEntry: JournalEntry = {
          id: entry.id,
          content: entry.entry_text,
          date: new Date(entry.timestamp_started).toISOString().split('T')[0],
          timestamp: entry.timestamp_started,
          mood: entry.mood as JournalEntry['mood'],
          weather: entry.weather_temperature ? {
            temperature: entry.weather_temperature,
            description: entry.weather_description || '',
            icon: entry.weather_icon || '',
            location: entry.weather_location || ''
          } : undefined,
          track: entry.spotify_track_uri ? {
            id: entry.spotify_track_uri.split(':').pop() || '',
            name: entry.spotify_track_name || '',
            artist: entry.spotify_track_artist || '',
            album: entry.spotify_track_album || '',
            albumArt: entry.spotify_track_image || '',
            uri: entry.spotify_track_uri
          } : undefined,
          createdAt: new Date(entry.created_at).getTime(),
          updatedAt: entry.updated_at ? new Date(entry.updated_at).getTime() : undefined,
          user_id: entry.user_id,
          comments: [],
          reflectionQuestion: entry.reflection_question || undefined,
          reflectionAnswer: entry.reflection_answer || undefined
        };
        
        const decrypted = await decryptJournalEntry(journalEntry, authState.user.id);
        decryptedDrafts.push(decrypted);
      }
      
      setDrafts(decryptedDrafts);
    } catch (error: any) {
      console.error('Error loading drafts:', error);
    } finally {
      setIsLoadingDrafts(false);
    }
  }, [authState.user]);

  useEffect(() => {
    if (authState.user) {
      loadDrafts();
    } else {
      setDrafts([]);
      // Clear mappings on logout
      tempIdToRealIdRef.current = {};
    }
  }, [authState.user, loadDrafts]);

  const createNewDraft = useCallback((): JournalEntry => {
    const now = new Date();
    const tempId = `draft-${Date.now()}`;
    return {
      id: tempId,
      content: '',
      date: now.toISOString().split('T')[0],
      timestamp: now.toISOString(),
      mood: 'neutral',
      createdAt: now.getTime(),
    };
  }, []);

  // Check if draft has meaningful content
  const hasMeaningfulContent = (entry: JournalEntry): boolean => {
    const textContent = entry.content?.replace(/<[^>]*>/g, '').trim() || '';
    return !!(textContent || entry.track || entry.mood !== 'neutral');
  };

  // Save or update draft in database using upsert (prevents duplicates across refreshes)
  const saveDraft = useCallback(async (entry: JournalEntry): Promise<string | null> => {
    if (!authState.user) return null;

    // Don't save if no meaningful content
    if (!hasMeaningfulContent(entry)) return null;

    const isTempId = entry.id.startsWith('draft-');
    const tempId = isTempId ? entry.id : null;

    try {
      const encryptedEntry = await encryptJournalEntry(entry, authState.user.id);

      const upsertDraftState = (saved: JournalEntry, removeTempId?: string | null) => {
        setDrafts(prev => {
          const filtered = prev.filter(d => d.id !== saved.id && (!removeTempId || d.id !== removeTempId));
          return [saved, ...filtered];
        });
      };

      // For real IDs (already in DB), just update by id
      if (!isTempId) {
        const { error } = await supabase
          .from('journal_entries')
          .update({
            entry_text: encryptedEntry.content,
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
            updated_at: new Date().toISOString()
          })
          .eq('id', entry.id);

        if (error) throw error;

        const saved: JournalEntry = { ...entry, updatedAt: Date.now() };
        upsertDraftState(saved);
        setLastAutoSave(new Date());
        return entry.id;
      }

      // For temp IDs: use upsert on (user_id, timestamp_started) to prevent duplicates
      // This handles refreshes, navigation, and race conditions uniformly
      const { data, error } = await supabase
        .from('journal_entries')
        .upsert(
          {
            user_id: authState.user.id,
            entry_text: encryptedEntry.content,
            mood: entry.mood,
            status: 'draft',
            spotify_track_uri: entry.track?.uri || null,
            spotify_track_name: entry.track?.name || null,
            spotify_track_artist: entry.track?.artist || null,
            spotify_track_album: entry.track?.album || null,
            spotify_track_image: entry.track?.albumArt || null,
            weather_temperature: entry.weather?.temperature ?? null,
            weather_description: entry.weather?.description || null,
            weather_icon: entry.weather?.icon || null,
            weather_location: entry.weather?.location || null,
            timestamp_started: entry.timestamp,
            updated_at: new Date().toISOString()
          },
          {
            onConflict: 'user_id,timestamp_started',
            ignoreDuplicates: false
          }
        )
        .select('id, created_at')
        .single();

      if (error) throw error;

      const savedDraft: JournalEntry = {
        ...entry,
        id: data.id,
        createdAt: new Date(data.created_at).getTime(),
        updatedAt: Date.now()
      };

      // Map temp id to real id for future reference
      if (tempId) {
        tempIdToRealIdRef.current[tempId] = data.id;
      }

      upsertDraftState(savedDraft, tempId);
      setCurrentDraft(savedDraft);
      currentDraftIdRef.current = data.id;
      setLastAutoSave(new Date());

      return data.id;
    } catch (error: any) {
      console.error('Error saving draft:', error);
      return null;
    }
  }, [authState.user]);

  // Auto-save with debouncing - calls onIdChanged when a temp ID is replaced with real DB ID
  const autoSaveDraft = useCallback((entry: JournalEntry, onIdChanged?: (newId: string) => void) => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    
    autoSaveTimeoutRef.current = setTimeout(async () => {
      const savedId = await saveDraft(entry);
      if (savedId && entry.id.startsWith('draft-') && savedId !== entry.id) {
        // Notify caller that the ID has changed
        onIdChanged?.(savedId);
        setCurrentDraft(prev => prev ? { ...prev, id: savedId } : null);
      }
    }, 1000);
  }, [saveDraft]);

  // Delete draft permanently
  const deleteDraft = useCallback(async (draftId: string) => {
    if (!authState.user) return;
    
    // Clear timeout if deleting
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    // Check if this temp ID maps to a real ID
    const realId = draftId.startsWith('draft-') ? tempIdToRealIdRef.current[draftId] : draftId;

    // If it's a temp draft that hasn't been saved yet, just clear it
    if (draftId.startsWith('draft-') && !realId) {
      setCurrentDraft(null);
      currentDraftIdRef.current = null;
      return;
    }

    const idToDelete = realId || draftId;

    try {
      const { error } = await supabase
        .from('journal_entries')
        .delete()
        .eq('id', idToDelete);

      if (error) throw error;

      setDrafts(prev => prev.filter(d => d.id !== idToDelete && d.id !== draftId));
      if (currentDraft?.id === idToDelete || currentDraft?.id === draftId) {
        setCurrentDraft(null);
        currentDraftIdRef.current = null;
      }

      // Clean up mapping
      if (draftId.startsWith('draft-')) {
        delete tempIdToRealIdRef.current[draftId];
      }

      toast({
        title: "Draft deleted",
        description: "Your draft has been permanently deleted."
      });
    } catch (error: any) {
      console.error('Error deleting draft:', error);
      toast({
        title: "Error deleting draft",
        description: error.message,
        variant: "destructive"
      });
    }
  }, [authState.user, currentDraft, toast]);

  // Publish draft (change status to published)
  const publishDraft = useCallback(async (entry: JournalEntry, addToContext: (entry: JournalEntry) => Promise<void>) => {
    if (!authState.user) return;

    const textContent = entry.content?.replace(/<[^>]*>/g, '').trim() || '';
    if (!textContent) {
      toast({
        title: "Cannot publish empty entry",
        description: "Please write something before publishing.",
        variant: "destructive"
      });
      return;
    }

    // Clear any pending auto-save
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    // Check if this temp ID maps to a real ID
    const realId = entry.id.startsWith('draft-') ? tempIdToRealIdRef.current[entry.id] : null;
    const actualId = realId || entry.id;
    const isNewDraft = entry.id.startsWith('draft-') && !realId;

    try {
      const encryptedEntry = await encryptJournalEntry(entry, authState.user.id);

      if (isNewDraft) {
        // Insert as published
        const { data, error } = await supabase
          .from('journal_entries')
          .insert([{
            user_id: authState.user.id,
            entry_text: encryptedEntry.content,
            mood: entry.mood,
            status: 'published',
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
        
        // Add to journal context
        const publishedEntry: JournalEntry = {
          ...entry,
          id: data.id,
          createdAt: new Date(data.created_at).getTime(),
        };
        await addToContext(publishedEntry);

        // Clear from drafts list
        setDrafts(prev => prev.filter(d => d.id !== entry.id));
      } else {
        // Update existing to published
        const { error } = await supabase
          .from('journal_entries')
          .update({
            entry_text: encryptedEntry.content,
            mood: entry.mood,
            status: 'published',
            spotify_track_uri: entry.track?.uri,
            spotify_track_name: entry.track?.name,
            spotify_track_artist: entry.track?.artist,
            spotify_track_album: entry.track?.album,
            spotify_track_image: entry.track?.albumArt,
            weather_temperature: entry.weather?.temperature,
            weather_description: entry.weather?.description,
            weather_icon: entry.weather?.icon,
            weather_location: entry.weather?.location,
            updated_at: new Date().toISOString()
          })
          .eq('id', actualId);

        if (error) throw error;

        // Add to journal context
        const publishedEntry: JournalEntry = {
          ...entry,
          id: actualId,
        };
        await addToContext(publishedEntry);

        // Remove from drafts list
        setDrafts(prev => prev.filter(d => d.id !== actualId && d.id !== entry.id));
      }

      // Clean up
      if (entry.id.startsWith('draft-')) {
        delete tempIdToRealIdRef.current[entry.id];
      }

      setCurrentDraft(null);
      currentDraftIdRef.current = null;

      toast({
        title: "Entry published",
        description: "Your journal entry has been published."
      });
    } catch (error: any) {
      console.error('Error publishing draft:', error);
      toast({
        title: "Error publishing entry",
        description: error.message,
        variant: "destructive"
      });
    }
  }, [authState.user, toast]);

  const loadDraft = useCallback((draftId: string) => {
    const draft = drafts.find(d => d.id === draftId);
    if (draft) {
      setCurrentDraft(draft);
      currentDraftIdRef.current = draftId;
    }
  }, [drafts]);

  const clearCurrentDraft = useCallback(() => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    setCurrentDraft(null);
    currentDraftIdRef.current = null;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  const value: DraftsContextType = {
    drafts,
    isLoadingDrafts,
    currentDraft,
    saveDraft,
    deleteDraft,
    publishDraft,
    loadDraft,
    clearCurrentDraft,
    createNewDraft,
    autoSaveDraft,
    lastAutoSave,
    reloadDrafts: loadDrafts
  };

  return (
    <DraftsContext.Provider value={value}>
      {children}
    </DraftsContext.Provider>
  );
}
