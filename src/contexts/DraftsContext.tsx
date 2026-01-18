import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { JournalEntry } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { encryptJournalEntry, decryptJournalEntry } from '@/utils/encryption';
import { mapDbRowToJournalEntry, buildDbPayload, hasMeaningfulContent } from '@/utils/journalEntryMapper';

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
  const tempIdToRealIdRef = useRef<Record<string, string>>({});

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
      for (const row of data || []) {
        const journalEntry = mapDbRowToJournalEntry(row);
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
      tempIdToRealIdRef.current = {};
    }
  }, [authState.user, loadDrafts]);

  const createNewDraft = useCallback((): JournalEntry => {
    const now = new Date();
    return {
      id: `draft-${Date.now()}`,
      content: '',
      date: now.toISOString().split('T')[0],
      timestamp: now.toISOString(),
      mood: 'neutral',
      createdAt: now.getTime(),
    };
  }, []);

  const upsertDraftState = useCallback((saved: JournalEntry, removeTempId?: string | null) => {
    setDrafts(prev => {
      const filtered = prev.filter(d => d.id !== saved.id && (!removeTempId || d.id !== removeTempId));
      return [saved, ...filtered];
    });
  }, []);

  const saveDraft = useCallback(async (entry: JournalEntry): Promise<string | null> => {
    if (!authState.user) return null;
    if (!hasMeaningfulContent(entry)) return null;

    const isTempId = entry.id.startsWith('draft-');
    const tempId = isTempId ? entry.id : null;

    try {
      const encryptedEntry = await encryptJournalEntry(entry, authState.user.id);
      const payload = buildDbPayload(entry, encryptedEntry.content);

      // For real IDs (already in DB), just update by id
      if (!isTempId) {
        const { error } = await supabase
          .from('journal_entries')
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq('id', entry.id);

        if (error) throw error;

        const saved: JournalEntry = { ...entry, updatedAt: Date.now() };
        upsertDraftState(saved);
        setLastAutoSave(new Date());
        return entry.id;
      }

      // For temp IDs: Check if a draft with this timestamp already exists
      const { data: existingDraft, error: lookupError } = await supabase
        .from('journal_entries')
        .select('id')
        .eq('user_id', authState.user.id)
        .eq('timestamp_started', entry.timestamp)
        .eq('status', 'draft')
        .maybeSingle();

      if (lookupError) {
        console.error('Error looking up existing draft:', lookupError);
      }

      let savedId: string;
      
      if (existingDraft) {
        const { error: updateError } = await supabase
          .from('journal_entries')
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq('id', existingDraft.id);

        if (updateError) throw updateError;
        savedId = existingDraft.id;
      } else {
        const { data: insertedDraft, error: insertError } = await supabase
          .from('journal_entries')
          .insert({
            user_id: authState.user.id,
            ...payload,
            status: 'draft',
            timestamp_started: entry.timestamp,
            updated_at: new Date().toISOString()
          })
          .select('id, created_at')
          .single();

        if (insertError) throw insertError;
        savedId = insertedDraft.id;
      }

      const savedDraft: JournalEntry = { ...entry, id: savedId, updatedAt: Date.now() };

      if (tempId) {
        tempIdToRealIdRef.current[tempId] = savedId;
      }

      upsertDraftState(savedDraft, tempId);
      setCurrentDraft(savedDraft);
      currentDraftIdRef.current = savedId;
      setLastAutoSave(new Date());

      return savedId;
    } catch (error: any) {
      console.error('Error saving draft:', error);
      return null;
    }
  }, [authState.user, upsertDraftState]);

  const autoSaveDraft = useCallback((entry: JournalEntry, onIdChanged?: (newId: string) => void) => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    
    autoSaveTimeoutRef.current = setTimeout(async () => {
      const savedId = await saveDraft(entry);
      if (savedId && entry.id.startsWith('draft-') && savedId !== entry.id) {
        onIdChanged?.(savedId);
        setCurrentDraft(prev => prev ? { ...prev, id: savedId } : null);
      }
    }, 1000);
  }, [saveDraft]);

  const deleteDraft = useCallback(async (draftId: string) => {
    if (!authState.user) return;
    
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

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

    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    const realId = entry.id.startsWith('draft-') ? tempIdToRealIdRef.current[entry.id] : null;
    const actualId = realId || entry.id;
    const isNewDraft = entry.id.startsWith('draft-') && !realId;

    try {
      const encryptedEntry = await encryptJournalEntry(entry, authState.user.id);
      const payload = buildDbPayload(entry, encryptedEntry.content);

      if (isNewDraft) {
        const { data, error } = await supabase
          .from('journal_entries')
          .insert([{
            user_id: authState.user.id,
            ...payload,
            status: 'published',
            timestamp_started: entry.timestamp
          }])
          .select()
          .single();

        if (error) throw error;
        
        const publishedEntry: JournalEntry = {
          ...entry,
          id: data.id,
          createdAt: new Date(data.created_at).getTime(),
        };
        await addToContext(publishedEntry);
        setDrafts(prev => prev.filter(d => d.id !== entry.id));
      } else {
        const { error } = await supabase
          .from('journal_entries')
          .update({
            ...payload,
            status: 'published',
            updated_at: new Date().toISOString()
          })
          .eq('id', actualId);

        if (error) throw error;

        const publishedEntry: JournalEntry = { ...entry, id: actualId };
        await addToContext(publishedEntry);
        setDrafts(prev => prev.filter(d => d.id !== actualId && d.id !== entry.id));
      }

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
