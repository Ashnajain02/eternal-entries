import React, { useState, useCallback, useMemo } from 'react';
import { Shuffle, Loader2 } from 'lucide-react';
import { useJournal } from '@/contexts/JournalContext';
import ScrollEntry from '@/components/shared/ScrollEntry';
import Layout from '@/components/Layout';
import { useIsMobile } from '@/hooks/use-mobile';

const Memories: React.FC = () => {
  const isMobile = useIsMobile();
  const { getRandomEntries, entries, isLoading } = useJournal();

  // "On this day" entries — same month/day, different years
  const onThisDayEntries = useMemo(() => {
    const now = new Date();
    const month = now.getMonth();
    const day = now.getDate();
    const todayDate = now.toISOString().split('T')[0];

    return entries
      .filter((e) => {
        if (e.date === todayDate) return false; // exclude today's entries
        const d = e.timestamp ? new Date(e.timestamp) : new Date(e.date + 'T00:00:00');
        return d.getMonth() === month && d.getDate() === day;
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [entries]);

  const hasOnThisDay = onThisDayEntries.length > 0;

  const [randomEntries, setRandomEntries] = useState(() => getRandomEntries(3));

  React.useEffect(() => {
    if (entries.length > 0 && randomEntries.length === 0) {
      setRandomEntries(getRandomEntries(3));
    }
  }, [entries.length, randomEntries.length, getRandomEntries]);

  const handleShuffle = useCallback(() => {
    setRandomEntries(getRandomEntries(3));
  }, [getRandomEntries]);

  const displayEntries = hasOnThisDay ? onThisDayEntries : randomEntries;
  const navHeight = isMobile ? 56 : 64;

  return (
    <Layout>
      <div className="fixed inset-0 top-0 flex flex-col" style={{ paddingTop: navHeight }}>
        {displayEntries.length > 0 ? (
          <div className="flex-1 overflow-y-auto">
            {/* Section header */}
            <div className="text-center pt-12 pb-4">
              <h2 className="font-display text-2xl md:text-3xl text-foreground/80 tracking-tight">
                {hasOnThisDay ? 'On this day' : 'Memories'}
              </h2>
              {hasOnThisDay && (
                <p className="text-sm text-muted-foreground/60 mt-1">
                  {onThisDayEntries.length} {onThisDayEntries.length === 1 ? 'entry' : 'entries'} from past years
                </p>
              )}
            </div>

            {displayEntries.map((entry) => (
              <ScrollEntry key={entry.id} entry={entry} showTimeAgo />
            ))}
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

        {/* Shuffle button (only when showing random entries) */}
        {!hasOnThisDay && displayEntries.length > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
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
