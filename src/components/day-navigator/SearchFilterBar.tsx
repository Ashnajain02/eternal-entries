import React, { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { JournalEntry } from '@/types';
import { parseDate } from '@/utils/dateUtils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, X } from 'lucide-react';

interface SearchFilterBarProps {
  entries: JournalEntry[];
  onMatchedEntries: (entries: JournalEntry[]) => void;
  isActive: boolean;
  onActiveChange: (active: boolean) => void;
}

const months = Array.from({ length: 12 }, (_, i) => {
  const date = new Date(2000, i, 1);
  return { value: String(i), label: format(date, 'MMMM') };
});

const days = Array.from({ length: 31 }, (_, i) => ({
  value: String(i + 1),
  label: String(i + 1),
}));

const SearchFilterBar: React.FC<SearchFilterBarProps> = ({ entries, onMatchedEntries, isActive, onActiveChange }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<string | undefined>(undefined);
  const [selectedDay, setSelectedDay] = useState<string | undefined>(undefined);
  const [selectedYear, setSelectedYear] = useState<string | undefined>(undefined);

  const years = useMemo(() => {
    return Array.from(
      new Set(entries.map((entry) => {
        const d = parseDate(entry.timestamp || entry.date);
        return d.getFullYear();
      }))
    ).sort((a, b) => b - a);
  }, [entries]);

  const hasFilters = Boolean(
    searchQuery.trim() || selectedMonth !== undefined || selectedDay !== undefined || (selectedYear !== undefined && selectedYear !== 'any')
  );

  useEffect(() => {
    if (!hasFilters) {
      onActiveChange(false);
      onMatchedEntries([]);
      return;
    }

    let filtered = [...entries];

    // Keyword search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(entry =>
        entry.content.toLowerCase().includes(q) ||
        entry.weather?.location?.toLowerCase().includes(q) ||
        entry.track?.name?.toLowerCase().includes(q) ||
        entry.track?.artist?.toLowerCase().includes(q)
      );
    }

    // Date filters
    const hasMonth = selectedMonth !== undefined;
    const hasDay = selectedDay !== undefined;
    const hasYear = selectedYear !== undefined && selectedYear !== 'any';

    if (hasMonth || hasDay || hasYear) {
      filtered = filtered.filter(entry => {
        const d = parseDate(entry.timestamp || entry.date);
        if (hasMonth && d.getMonth() !== parseInt(selectedMonth!)) return false;
        if (hasDay && d.getDate() !== parseInt(selectedDay!)) return false;
        if (hasYear && d.getFullYear() !== parseInt(selectedYear!)) return false;
        return true;
      });
    }

    // Sort newest first
    filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    onActiveChange(true);
    onMatchedEntries(filtered);
  }, [entries, searchQuery, selectedMonth, selectedDay, selectedYear, hasFilters]);

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedMonth(undefined);
    setSelectedDay(undefined);
    setSelectedYear(undefined);
  };

  return (
    <div className="bg-card/50 backdrop-blur-sm border-b border-border/50 px-4 py-2.5">
      <div className="max-w-3xl mx-auto flex items-center gap-2">
        {/* Search input */}
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 bg-background/50 border-border/50 h-8 text-xs"
          />
        </div>

        {/* Date filters inline */}
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-[100px] h-8 text-xs bg-background/50 border-border/50">
            <SelectValue placeholder="Month" />
          </SelectTrigger>
          <SelectContent>
            {months.map((month) => (
              <SelectItem key={month.value} value={month.value}>
                {month.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedDay} onValueChange={setSelectedDay}>
          <SelectTrigger className="w-[70px] h-8 text-xs bg-background/50 border-border/50">
            <SelectValue placeholder="Day" />
          </SelectTrigger>
          <SelectContent>
            {days.map((day) => (
              <SelectItem key={day.value} value={day.value}>
                {day.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedYear} onValueChange={setSelectedYear}>
          <SelectTrigger className="w-[80px] h-8 text-xs bg-background/50 border-border/50">
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any Year</SelectItem>
            {years.map((year) => (
              <SelectItem key={year} value={year.toString()}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {isActive && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 w-8 p-0 text-muted-foreground shrink-0">
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
};

export default SearchFilterBar;
