import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shuffle, Loader2 } from 'lucide-react';
import { useJournal } from '@/contexts/JournalContext';
import JournalEntryView from '@/components/JournalEntry';
import Layout from '@/components/Layout';
import DayArrows from '@/components/day-navigator/DayArrows';
import { useIsMobile } from '@/hooks/use-mobile';
import { formatTimeAgo } from '@/utils/timeAgo';

const Memories: React.FC = () => {
  const isMobile = useIsMobile();
  const { getRandomEntries, entries, isLoading } = useJournal();
  const [memoryEntries, setMemoryEntries] = useState(() => getRandomEntries(5));
  const [currentIndex, setCurrentIndex] = useState(0);

  // Re-initialize if entries load after initial render
  React.useEffect(() => {
    if (entries.length > 0 && memoryEntries.length === 0) {
      setMemoryEntries(getRandomEntries(5));
    }
  }, [entries.length, memoryEntries.length, getRandomEntries]);

  const handleShuffle = useCallback(() => {
    setMemoryEntries(getRandomEntries(5));
    setCurrentIndex(0);
  }, [getRandomEntries]);

  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < memoryEntries.length - 1;

  const goToPrev = useCallback(() => {
    if (hasPrev) setCurrentIndex(prev => prev - 1);
  }, [hasPrev]);

  const goToNext = useCallback(() => {
    if (hasNext) setCurrentIndex(prev => prev + 1);
  }, [hasNext]);

  // Keyboard navigation
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); goToPrev(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); goToNext(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToPrev, goToNext]);

  const currentEntry = memoryEntries[currentIndex] || null;
  const navHeight = isMobile ? 56 : 64;

  const counterText = useMemo(() => {
    if (memoryEntries.length <= 1) return '';
    return `${currentIndex + 1} / ${memoryEntries.length}`;
  }, [memoryEntries.length, currentIndex]);

  const scrollRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [currentIndex]);

  return (
    <Layout>
      <div className="fixed inset-0 top-0 flex flex-col" style={{ paddingTop: navHeight }}>
        {currentEntry ? (
          <div ref={scrollRef} className="flex-1 overflow-y-auto">
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
                  {/* Time ago label */}
                  <div className="text-center mb-2">
                    <span className="text-xs text-muted-foreground/50 tracking-widest uppercase">
                      {formatTimeAgo(currentEntry.timestamp)}
                    </span>
                  </div>
                  <JournalEntryView entry={currentEntry} isFullView />
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        ) : isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <p className="text-muted-foreground">No past entries to revisit yet.</p>
              <p className="text-sm text-muted-foreground/60 mt-1">Start journaling to build your memories.</p>
            </div>
          </div>
        )}

        {/* Navigation arrows */}
        <DayArrows
          onPrevDay={goToPrev}
          onNextDay={goToNext}
          hasPrevDay={hasPrev}
          hasNextDay={hasNext}
        />

        {/* Counter + shuffle */}
        {memoryEntries.length > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3">
            {counterText && (
              <span className="text-xs text-muted-foreground bg-card/70 backdrop-blur-sm px-3 py-1 rounded-full border border-border/40">
                {counterText}
              </span>
            )}
            <button
              onClick={handleShuffle}
              className="flex items-center gap-1.5 text-xs text-muted-foreground bg-card/70 backdrop-blur-sm px-3 py-1 rounded-full border border-border/40 hover:bg-card/90 transition-colors"
            >
              <Shuffle className="h-3 w-3" />
              Shuffle
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Memories;
