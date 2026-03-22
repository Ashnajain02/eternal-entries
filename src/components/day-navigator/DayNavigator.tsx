import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search } from 'lucide-react';
import { useJournal } from '@/contexts/JournalContext';
import { JournalEntry } from '@/types';
import ScrollEntry from '@/components/shared/ScrollEntry';
import SearchFilterBar from './SearchFilterBar';
import { useIsMobile } from '@/hooks/use-mobile';

const DayNavigator: React.FC = () => {
  const isMobile = useIsMobile();
  const { entries } = useJournal();

  // Search state
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [matchedEntries, setMatchedEntries] = useState<JournalEntry[]>([]);

  // All entries sorted newest first
  const sortedEntries = useMemo(() => {
    return [...entries].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [entries]);

  const displayEntries = isSearchActive ? matchedEntries : sortedEntries;

  const handleMatchedEntries = useCallback((results: JournalEntry[]) => {
    setMatchedEntries(results);
  }, []);

  const handleSearchActiveChange = useCallback((active: boolean) => {
    setIsSearchActive(active);
  }, []);

  const navHeight = isMobile ? 56 : 64;

  return (
    <div className="fixed inset-0 top-0 flex flex-col" style={{ paddingTop: navHeight }}>
      {/* Collapsible search bar */}
      <AnimatePresence>
        {isSearchOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <SearchFilterBar
              entries={entries}
              onMatchedEntries={handleMatchedEntries}
              isActive={isSearchActive}
              onActiveChange={handleSearchActiveChange}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Vertical scroll feed */}
      {displayEntries.length > 0 ? (
        <div className="flex-1 overflow-y-auto">
          {displayEntries.map((entry) => (
            <ScrollEntry key={entry.id} entry={entry} />
          ))}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">
            {isSearchActive ? 'No entries found' : 'No entries yet'}
          </p>
        </div>
      )}

      {/* Search icon — pinned top-right, just below nav */}
      <button
        onClick={() => setIsSearchOpen(prev => !prev)}
        className={`fixed z-40 right-4 md:right-6 flex items-center justify-center h-10 w-10 rounded-full transition-all bg-card/60 backdrop-blur-sm border border-border/50 hover:bg-card/90 hover:border-border ${isSearchOpen ? 'bg-card/90 border-border' : ''}`}
        style={{ top: navHeight + 8 }}
        aria-label="Toggle search"
      >
        <Search className="h-4 w-4 text-foreground" />
      </button>
    </div>
  );
};

export default DayNavigator;
