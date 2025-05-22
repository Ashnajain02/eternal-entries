
import { useState, useEffect } from 'react';
import { JournalEntry } from '@/types';
import { useJournal } from '@/contexts/journal/JournalContext';

export function useJournalEntry(entryId: string | undefined) {
  const { entries, isLoading } = useJournal();
  const [entry, setEntry] = useState<JournalEntry | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (!isLoading && entryId) {
      const foundEntry = entries.find(e => e.id === entryId);
      setEntry(foundEntry);
      setLoading(false);
    } else if (!isLoading) {
      setLoading(false);
    }
  }, [entries, entryId, isLoading]);
  
  return { entry, loading };
}
