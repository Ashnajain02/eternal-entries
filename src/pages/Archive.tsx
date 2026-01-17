
import React, { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { useJournal } from '@/contexts/JournalContext';
import Layout from '@/components/Layout';
import JournalEntryView from '@/components/JournalEntry';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  Popover, 
  PopoverTrigger, 
  PopoverContent 
} from '@/components/ui/popover';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Calendar as CalendarIcon, X } from 'lucide-react';

const Archive = () => {
  const { entries } = useJournal();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const [filteredEntries, setFilteredEntries] = useState<typeof entries>([]);
  const [searchMode, setSearchMode] = useState<'thisDay' | 'keyword' | 'specificDate'>('thisDay');
  
  // Get current date details for default "this day in history" view
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentDay = today.getDate();
  const currentMonthName = format(today, 'MMMM');
  
  // Generate options for month, day, and year selects
  const months = Array.from({ length: 12 }, (_, i) => {
    const date = new Date(2000, i, 1);
    return { value: String(i), label: format(date, 'MMMM') };
  });
  
  const days = Array.from({ length: 31 }, (_, i) => ({
    value: String(i + 1),
    label: String(i + 1),
  }));
  
  // Get years from entries (properly parsed from date strings)
  const years = Array.from(
    new Set(entries.map((entry) => {
      // Ensure we're extracting the year from the correct date property
      // First try to get it from timestamp, then fall back to date property
      const entryDate = entry.timestamp 
        ? new Date(entry.timestamp) 
        : new Date(entry.date + 'T00:00:00');
      return entryDate.getFullYear();
    }))
  ).sort((a, b) => b - a); // Sort years in descending order
  
  // Parse a date string to ensure consistent date handling
  const parseEntryDate = (entry: typeof entries[0]) => {
    if (entry.timestamp) {
      return new Date(entry.timestamp);
    }
    
    if (entry.date) {
      // Ensure proper parsing by adding time component
      return new Date(entry.date + 'T00:00:00');
    }
    
    return new Date(); // Fallback, should never happen
  };
  
  // Filter entries based on the current search mode and criteria
  useEffect(() => {
    let filtered = [...entries];
    
    if (searchMode === 'thisDay') {
      // Show entries from this day in previous years
      filtered = entries.filter(entry => {
        const entryDate = parseEntryDate(entry);
        return (
          entryDate.getMonth() === currentMonth && 
          entryDate.getDate() === currentDay &&
          entryDate.getFullYear() <= today.getFullYear()
        );
      });
    } else if (searchMode === 'keyword' && searchQuery.trim()) {
      // Filter by keyword search
      const lowercaseQuery = searchQuery.toLowerCase();
      filtered = entries.filter(entry => 
        entry.content.toLowerCase().includes(lowercaseQuery) ||
        (entry.weather?.location?.toLowerCase().includes(lowercaseQuery)) ||
        (entry.track?.name?.toLowerCase().includes(lowercaseQuery)) ||
        (entry.track?.artist?.toLowerCase().includes(lowercaseQuery))
      );
    } else if (searchMode === 'specificDate') {
      // Filter by any combination of month, day, year
      const hasMonth = selectedMonth !== null;
      const hasDay = selectedDay !== null;
      const hasYear = selectedYear !== null && selectedYear !== "any";
      
      // Only filter if at least one criteria is selected
      if (hasMonth || hasDay || hasYear) {
        filtered = entries.filter(entry => {
          const entryDate = parseEntryDate(entry);
          
          // Check each criteria only if it's set
          if (hasMonth) {
            const month = parseInt(selectedMonth);
            if (entryDate.getMonth() !== month) return false;
          }
          
          if (hasDay) {
            const day = parseInt(selectedDay);
            if (entryDate.getDate() !== day) return false;
          }
          
          if (hasYear) {
            const year = parseInt(selectedYear);
            if (entryDate.getFullYear() !== year) return false;
          }
          
          return true;
        });
      }
    }
    
    // Sort filtered entries by date (newest first)
    filtered.sort((a, b) => {
      const dateA = parseEntryDate(a).getTime();
      const dateB = parseEntryDate(b).getTime();
      return dateB - dateA;
    });
    
    setFilteredEntries(filtered);
  }, [entries, searchQuery, selectedDate, searchMode, selectedMonth, selectedDay, selectedYear, currentMonth, currentDay, today]);
  
  // Generate the header text based on current filters
  const getHeaderText = () => {
    if (searchMode === 'thisDay') {
      return `Entries from ${currentMonthName} ${currentDay} in Previous Years`;
    } else if (searchMode === 'keyword' && searchQuery.trim()) {
      return `Search Results for "${searchQuery}"`;
    } else if (searchMode === 'specificDate') {
      const hasMonth = selectedMonth !== null;
      const hasDay = selectedDay !== null;
      const hasYear = selectedYear !== null && selectedYear !== "any";
      
      if (!hasMonth && !hasDay && !hasYear) {
        return "Journal Archive";
      }
      
      const parts: string[] = [];
      
      if (hasMonth) {
        const monthName = format(new Date(2000, parseInt(selectedMonth), 1), 'MMMM');
        parts.push(monthName);
      }
      
      if (hasDay) {
        parts.push(selectedDay!);
      }
      
      if (hasYear) {
        parts.push(selectedYear!);
      }
      
      const dateStr = parts.join(' ');
      return `Entries from ${dateStr}`;
    }
    
    return "Journal Archive";
  };
  
  // Switch to keyword search mode
  const handleSearchKeyword = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    if (e.target.value.trim()) {
      setSearchMode('keyword');
    } else if (searchMode === 'keyword') {
      setSearchMode('thisDay');
    }
  };
  
  // Switch to specific date search mode when date parts are selected
  const handleDatePartChange = () => {
    setSearchMode('specificDate');
  };
  
  const clearFilters = () => {
    setSearchQuery('');
    setSelectedDate(undefined);
    setSelectedMonth(null);
    setSelectedDay(null);
    setSelectedYear(null);
    setSearchMode('thisDay');
  };
  
  // Group entries by year for display
  const entriesByYear = filteredEntries.reduce((groups, entry) => {
    // Use the same parse function to get a consistent year value
    const year = parseEntryDate(entry).getFullYear();
    if (!groups[year]) {
      groups[year] = [];
    }
    groups[year].push(entry);
    return groups;
  }, {} as Record<number, typeof entries>);
  
  // Sort years in descending order
  const sortedYears = Object.keys(entriesByYear)
    .map(Number)
    .sort((a, b) => b - a);
  
  return (
    <Layout>
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Journal Archive</h1>
        
        <Card className="p-4 mb-8">
          <div className="flex flex-col space-y-4">
            {/* Keyword search */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search journal entries..."
                value={searchQuery}
                onChange={handleSearchKeyword}
                className="pl-9"
              />
            </div>
            
            {/* Date part selectors */}
            <div className="flex flex-wrap gap-2">
              <Select
                value={selectedMonth}
                onValueChange={(value) => {
                  setSelectedMonth(value);
                  handleDatePartChange();
                }}
              >
                <SelectTrigger className="w-[140px]">
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
              
              <Select
                value={selectedDay}
                onValueChange={(value) => {
                  setSelectedDay(value);
                  handleDatePartChange();
                }}
              >
                <SelectTrigger className="w-[100px]">
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
              
              <Select
                value={selectedYear}
                onValueChange={(value) => {
                  setSelectedYear(value);
                  handleDatePartChange();
                }}
              >
                <SelectTrigger className="w-[100px]">
                  <SelectValue placeholder="Year (optional)" />
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
              
              <Button variant="ghost" onClick={clearFilters} className="ml-auto">
                <X className="h-4 w-4 mr-2" />
                Clear filters
              </Button>
            </div>
          </div>
        </Card>
        
        <h2 className="text-2xl font-bold mb-4">{getHeaderText()}</h2>
        
        {sortedYears.length > 0 ? (
          sortedYears.map(year => (
            <div key={year} className="mb-12">
              <h3 className="text-xl font-semibold mb-4">{year}</h3>
              <div className="space-y-6">
                {entriesByYear[year].map(entry => (
                  <JournalEntryView key={entry.id} entry={entry} />
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No journal entries found</p>
            <Button variant="link" onClick={clearFilters} className="mt-2">
              Clear filters to see all entries
            </Button>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Archive;
