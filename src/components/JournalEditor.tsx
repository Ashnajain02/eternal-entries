import React, { useEffect, useState, useCallback } from 'react';
import { JournalEntry } from '@/types';
import JournalEditorContainer from './journal/JournalEditorContainer';
import { useDrafts } from '@/hooks/useDrafts';
import { useJournal } from '@/contexts/JournalContext';

interface JournalEditorProps {
  initialDraft?: JournalEntry;
  onComplete?: () => void;
}

const JournalEditor: React.FC<JournalEditorProps> = ({ initialDraft, onComplete }) => {
  const { addEntry } = useJournal();
  const { 
    createNewDraft, 
    deleteDraft, 
    publishDraft,
    autoSaveDraft,
    clearCurrentDraft,
    lastAutoSave
  } = useDrafts();
  
  const [entry, setEntry] = useState<JournalEntry | null>(() => {
    return initialDraft || createNewDraft();
  });
  const [currentEntryState, setCurrentEntryState] = useState<JournalEntry | null>(entry);

  // Update entry if initialDraft changes
  useEffect(() => {
    if (initialDraft) {
      setEntry(initialDraft);
      setCurrentEntryState(initialDraft);
    }
  }, [initialDraft?.id]);

  const handleAutoSave = useCallback((updatedEntry: JournalEntry) => {
    setCurrentEntryState(updatedEntry);
    
    // When auto-save returns a new ID (temp -> real), update our entry state
    autoSaveDraft(updatedEntry, (newId) => {
      setEntry(prev => prev ? { ...prev, id: newId } : null);
      setCurrentEntryState(prev => prev ? { ...prev, id: newId } : null);
    });
  }, [autoSaveDraft]);

  const handlePublish = useCallback(async () => {
    if (currentEntryState) {
      await publishDraft(currentEntryState, addEntry);
      clearCurrentDraft();
      onComplete?.();
    }
  }, [currentEntryState, publishDraft, addEntry, clearCurrentDraft, onComplete]);

  const handleDelete = useCallback(async () => {
    if (currentEntryState) {
      await deleteDraft(currentEntryState.id);
      clearCurrentDraft();
      onComplete?.();
    }
  }, [currentEntryState, deleteDraft, clearCurrentDraft, onComplete]);

  const handleClose = useCallback(() => {
    clearCurrentDraft();
    onComplete?.();
  }, [clearCurrentDraft, onComplete]);

  if (!entry) return null;

  return (
    <JournalEditorContainer 
      entry={entry}
      onPublish={handlePublish}
      onDelete={handleDelete}
      onClose={handleClose}
      onAutoSave={handleAutoSave}
      lastAutoSave={lastAutoSave}
    />
  );
};

export default JournalEditor;
