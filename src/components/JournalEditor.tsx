
import React from 'react';
import { JournalEntry } from '@/types';
import JournalEditorContainer from './journal/JournalEditorContainer';

interface JournalEditorProps {
  entry?: JournalEntry;
  onSave?: () => void;
}

const JournalEditor: React.FC<JournalEditorProps> = ({ entry, onSave }) => {
  return <JournalEditorContainer entry={entry} onSave={onSave} />;
};

export default JournalEditor;
