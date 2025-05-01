
import React, { useState } from 'react';
import { format } from 'date-fns';
import { useJournal } from '@/contexts/JournalContext';
import Layout from '@/components/Layout';
import JournalEntryView from '@/components/JournalEntry';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Search, Calendar as CalendarIcon } from 'lucide-react';

const Archive = () => {
  const { entries, searchEntries } = useJournal();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  
  // Group entries by year
  const entriesByYear = entries.reduce((groups, entry) => {
    const year = new Date(entry.date).getFullYear();
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
  
  // Filter entries based on search query and selected date
  let filteredEntries = [...entries];
  
  if (searchQuery) {
    filteredEntries = searchEntries(searchQuery);
  }
  
  if (selectedDate) {
    const formattedSelectedDate = format(selectedDate, 'yyyy-MM-dd');
    filteredEntries = filteredEntries.filter(
      entry => entry.date === formattedSelectedDate
    );
  }
  
  // Group filtered entries by year
  const filteredEntriesByYear = filteredEntries.reduce((groups, entry) => {
    const year = new Date(entry.date).getFullYear();
    if (!groups[year]) {
      groups[year] = [];
    }
    groups[year].push(entry);
    return groups;
  }, {} as Record<number, typeof entries>);
  
  // Sort filtered years in descending order
  const filteredSortedYears = Object.keys(filteredEntriesByYear)
    .map(Number)
    .sort((a, b) => b - a);
  
  // Sort entries within each year by date (newest first)
  Object.values(filteredEntriesByYear).forEach(yearEntries => {
    yearEntries.sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  });
  
  const clearFilters = () => {
    setSearchQuery('');
    setSelectedDate(undefined);
  };
  
  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
  };
  
  return (
    <Layout>
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Journal Archive</h1>
        
        <Card className="p-4 mb-8">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search journal entries..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full sm:w-auto">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, 'PP') : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDateSelect}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            
            <Button variant="ghost" onClick={clearFilters} className="w-full sm:w-auto">
              Clear filters
            </Button>
          </div>
        </Card>
        
        {filteredSortedYears.length > 0 ? (
          filteredSortedYears.map(year => (
            <div key={year} className="mb-12">
              <h2 className="text-2xl font-bold mb-4">{year}</h2>
              <div className="space-y-6">
                {filteredEntriesByYear[year].map(entry => (
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
