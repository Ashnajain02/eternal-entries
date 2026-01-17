import React, { useEffect, useState, useCallback } from 'react';
import { JournalEntry } from '@/types';
import JournalEditorContainer from './journal/JournalEditorContainer';
import { useDrafts } from '@/hooks/useDrafts';
import { useJournal } from '@/contexts/JournalContext';

interface JournalEditorProps {
  draftId?: string;
  onComplete?: () => void;
}

const JournalEditor: React.FC<JournalEditorProps> = ({ draftId, onComplete }) => {
  const { addEntry } = useJournal();
  const { 
    drafts,
    currentDraft, 
    createNewDraft, 
    loadDraft, 
    deleteDraft, 
    publishDraft,
    autoSaveDraft,
    clearCurrentDraft,
    lastAutoSave
  } = useDrafts();
  
  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [currentEntryState, setCurrentEntryState] = useState<JournalEntry | null>(null);

  useEffect(() => {
    if (draftId) {
      loadDraft(draftId);
    } else if (!entry) {
      const newDraft = createNewDraft();
      setEntry(newDraft);
      setCurrentEntryState(newDraft);
    }
  }, [draftId]);

  useEffect(() => {
    if (currentDraft) {
      setEntry(currentDraft);
      setCurrentEntryState(currentDraft);
    }
  }, [currentDraft]);

  const handleAutoSave = useCallback((updatedEntry: JournalEntry) => {
    setCurrentEntryState(updatedEntry);
    autoSaveDraft(updatedEntry);
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
