import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search } from 'lucide-react';
import { useJournal } from '@/contexts/JournalContext';
import { JournalEntry } from '@/types';
import JournalEntryView from '@/components/JournalEntry';
import DayArrows from './DayArrows';
import SearchFilterBar from './SearchFilterBar';
import { useIsMobile } from '@/hooks/use-mobile';

const DayNavigator: React.FC = () => {
  const isMobile = useIsMobile();
  const {
    entries,
    sortedUniqueDates,
    getEntriesByDate,
    getNextEntryDay,
    getPrevEntryDay,
  } = useJournal();

  const [currentDate, setCurrentDate] = useState<string>(() => {
    return sortedUniqueDates[0] || new Date().toISOString().split('T')[0];
  });
  const [currentEntryIndex, setCurrentEntryIndex] = useState(0);

  // Search state
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [matchedEntries, setMatchedEntries] = useState<JournalEntry[]>([]);
  const [searchIndex, setSearchIndex] = useState(0);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (sortedUniqueDates.length > 0 && !sortedUniqueDates.includes(currentDate)) {
      setCurrentDate(sortedUniqueDates[0]);
    }
  }, [sortedUniqueDates]);

  const dayEntries = useMemo(() => {
    const e = getEntriesByDate(currentDate);
    return e.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [currentDate, getEntriesByDate]);

  // --- Navigation ---
  // Day navigation (left/right)
  const hasPrevDay = isSearchActive
    ? searchIndex > 0
    : getPrevEntryDay(currentDate) !== null;
  const hasNextDay = isSearchActive
    ? searchIndex < matchedEntries.length - 1
    : getNextEntryDay(currentDate) !== null;

  const goToPrevDay = useCallback(() => {
    if (isSearchActive) {
      setSearchIndex(prev => Math.max(0, prev - 1));
    } else {
      const prev = getPrevEntryDay(currentDate);
      if (prev) {
        setCurrentDate(prev);
        setCurrentEntryIndex(0);
      }
    }
  }, [isSearchActive, currentDate, getPrevEntryDay]);

  const goToNextDay = useCallback(() => {
    if (isSearchActive) {
      setSearchIndex(prev => Math.min(matchedEntries.length - 1, prev + 1));
    } else {
      const next = getNextEntryDay(currentDate);
      if (next) {
        setCurrentDate(next);
        setCurrentEntryIndex(0);
      }
    }
  }, [isSearchActive, matchedEntries.length, currentDate, getNextEntryDay]);

  // Entry navigation within same day (up/down)
  const hasPrevEntry = !isSearchActive && currentEntryIndex > 0;
  const hasNextEntry = !isSearchActive && currentEntryIndex < dayEntries.length - 1;

  const goToPrevEntry = useCallback(() => {
    if (hasPrevEntry) setCurrentEntryIndex(prev => prev - 1);
  }, [hasPrevEntry]);

  const goToNextEntry = useCallback(() => {
    if (hasNextEntry) setCurrentEntryIndex(prev => prev + 1);
  }, [hasNextEntry]);

  // Search handlers
  const handleMatchedEntries = useCallback((results: JournalEntry[]) => {
    setMatchedEntries(results);
    setSearchIndex(0);
  }, []);

  const handleSearchActiveChange = useCallback((active: boolean) => {
    setIsSearchActive(active);
    if (!active) setSearchIndex(0);
  }, []);

  // Scroll to top when entry changes
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    }
  }, [currentEntryIndex, currentDate, isSearchActive, searchIndex]);

  const navHeight = isMobile ? 56 : 64;

  // Which entry to show
  const displayEntries = isSearchActive ? matchedEntries : dayEntries;
  const visibleIndex = isSearchActive ? searchIndex : currentEntryIndex;
  const currentEntry = displayEntries[visibleIndex] || null;

  // Counter
  const counterText = useMemo(() => {
    if (isSearchActive) {
      if (matchedEntries.length <= 1) return '';
      return `${searchIndex + 1} / ${matchedEntries.length}`;
    }
    if (dayEntries.length <= 1) return '';
    return `${currentEntryIndex + 1} / ${dayEntries.length}`;
  }, [isSearchActive, matchedEntries.length, searchIndex, dayEntries.length, currentEntryIndex]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); goToPrevDay(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); goToNextDay(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); goToPrevEntry(); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); goToNextEntry(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToPrevDay, goToNextDay, goToPrevEntry, goToNextEntry]);

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

      {/* Full-page entry */}
      {currentEntry ? (
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentEntry.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="min-h-full"
            >
              <div className="w-full max-w-3xl mx-auto px-6 md:px-16 pt-10 pb-24">
                <JournalEntryView entry={currentEntry} isFullView />
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">
            {isSearchActive ? 'No entries found' : 'No entries yet'}
          </p>
        </div>
      )}

      {/* Search icon */}
      <button
        onClick={() => setIsSearchOpen(prev => !prev)}
        className={`fixed z-40 flex items-center justify-center h-10 w-10 rounded-full transition-all bg-card/60 backdrop-blur-sm border border-border/50 hover:bg-card/90 hover:border-border ${
          isMobile ? 'top-[68px] right-4' : 'top-[76px] right-6'
        } ${isSearchOpen ? 'bg-card/90 border-border' : ''}`}
        aria-label="Toggle search"
      >
        <Search className="h-4 w-4 text-foreground" />
      </button>

      {/* Navigation arrows — left/right for days, up/down for entries */}
      <DayArrows
        onPrevDay={goToPrevDay}
        onNextDay={goToNextDay}
        hasPrevDay={hasPrevDay}
        hasNextDay={hasNextDay}
        onPrevEntry={goToPrevEntry}
        onNextEntry={goToNextEntry}
        hasPrevEntry={hasPrevEntry}
        counterText={counterText}
        hasNextEntry={hasNextEntry}
      />
    </div>
  );
};

export default DayNavigator;
