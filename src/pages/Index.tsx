
import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { useJournal } from '@/contexts/JournalContext';
import Layout from '@/components/Layout';
import JournalEditor from '@/components/JournalEditor';
import JournalEntryView from '@/components/JournalEntry';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const Index = () => {
  const { entries, createNewEntry } = useJournal();
  const [isWriting, setIsWriting] = useState(false);
  const [todayEntry, setTodayEntry] = useState<any | null>(null);
  const [pastEntries, setPastEntries] = useState<any[]>([]);
  
  // Check if we have an entry for today
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    
    // Find today's entry
    const todaysEntry = entries.find(entry => 
      entry.date === today
    );
    
    setTodayEntry(todaysEntry || null);
    
    // Find entries from this day in previous years
    const thisMonth = new Date().getMonth();
    const thisDay = new Date().getDate();
    
    const sameDayEntries = entries.filter(entry => {
      const entryDate = new Date(entry.date);
      return (
        entryDate.getMonth() === thisMonth && 
        entryDate.getDate() === thisDay &&
        entryDate.toISOString().split('T')[0] !== today
      );
    });
    
    // Sort by most recent first
    sameDayEntries.sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    
    setPastEntries(sameDayEntries);
  }, [entries]);

  const handleFinishWriting = () => {
    setIsWriting(false);
  };

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-6">Today's Journal</h1>
          
          {isWriting ? (
            <JournalEditor onSave={handleFinishWriting} />
          ) : todayEntry ? (
            <>
              <JournalEntryView entry={todayEntry} />
              <div className="mt-4 text-center">
                <Button onClick={() => setIsWriting(true)}>
                  Edit Today's Entry
                </Button>
              </div>
            </>
          ) : (
            <Card className="p-6 text-center space-y-4 animated-gradient">
              <h2 className="text-xl font-semibold">Start today's journal entry</h2>
              <p className="text-muted-foreground">
                Capture your thoughts, the weather, and what you're listening to.
              </p>
              <Button onClick={() => setIsWriting(true)}>
                Write Today's Entry
              </Button>
            </Card>
          )}
        </div>
        
        {pastEntries.length > 0 && (
          <div>
            <h2 className="text-2xl font-semibold mb-4">
              This day in past years
            </h2>
            <div className="space-y-6">
              {pastEntries.map(entry => (
                <JournalEntryView 
                  key={entry.id} 
                  entry={entry} 
                  isPreview 
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Index;
