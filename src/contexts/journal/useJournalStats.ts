
import { useMemo } from 'react';
import { JournalEntry, Mood } from '@/types';

export function useJournalStats(entries: JournalEntry[]) {
  return useMemo(() => {
    // Calculate total entries
    const totalEntries = entries.length;
    
    // Calculate mood counts
    const moodCounts: Record<Mood, number> = {
      happy: 0,
      content: 0,
      neutral: 0,
      sad: 0,
      anxious: 0,
      angry: 0,
      emotional: 0,
      'in-love': 0,
      excited: 0,
      tired: 0
    };
    
    entries.forEach(entry => {
      if (entry.mood) {
        moodCounts[entry.mood]++;
      }
    });
    
    // Calculate longest streak (consecutive days)
    let longestStreak = 0;
    let currentStreak = 0;
    let lastDate: Date | null = null;
    
    // Sort entries by date
    const sortedEntries = [...entries].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    
    // Get unique dates
    const uniqueDates = new Set(sortedEntries.map(entry => entry.date));
    const uniqueSortedDates = Array.from(uniqueDates).sort();
    
    uniqueSortedDates.forEach((dateStr, index) => {
      const entryDate = new Date(dateStr);
      
      if (lastDate) {
        // Check if this entry is one day after the last one
        const dayDiff = Math.floor(
          (entryDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        
        if (dayDiff === 1) {
          currentStreak++;
        } else if (dayDiff > 1) {
          // Reset streak if there's a gap
          currentStreak = 1;
        }
      } else {
        // First entry
        currentStreak = 1;
      }
      
      // Update longest streak if needed
      longestStreak = Math.max(longestStreak, currentStreak);
      lastDate = entryDate;
    });
    
    // Calculate most common journaling time
    const hourCounts: Record<number, number> = {};
    entries.forEach(entry => {
      if (entry.timestamp) {
        const hour = new Date(entry.timestamp).getHours();
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      }
    });
    
    let mostCommonHour = -1;
    let maxCount = 0;
    
    Object.entries(hourCounts).forEach(([hour, count]) => {
      if (count > maxCount) {
        mostCommonHour = parseInt(hour);
        maxCount = count;
      }
    });
    
    const mostCommonTime = mostCommonHour >= 0
      ? `${mostCommonHour % 12 || 12}${mostCommonHour >= 12 ? 'PM' : 'AM'}`
      : null;
    
    return {
      totalEntries,
      moodCounts,
      longestStreak,
      mostCommonTime
    };
  }, [entries]);
}
