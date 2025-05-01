
import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { useJournal } from '@/contexts/JournalContext';
import Layout from '@/components/Layout';
import JournalEditor from '@/components/JournalEditor';
import JournalEntryView from '@/components/JournalEntry';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Plus, Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import SettingsLink from '@/components/SettingsLink';

const Index = () => {
  const { entries, createNewEntry, isLoading } = useJournal();
  const { authState } = useAuth();
  const [isWriting, setIsWriting] = useState(false);
  const [todayEntries, setTodayEntries] = useState<any[]>([]);
  const [pastEntries, setPastEntries] = useState<any[]>([]);
  
  // Check for entries made today and on this day in previous years
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    
    // Find today's entries
    const todaysEntries = entries.filter(entry => 
      entry.date === today
    );
    
    // Sort by most recent first
    todaysEntries.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    
    setTodayEntries(todaysEntries);
    
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

  const handleCreateNewEntry = () => {
    setIsWriting(true);
  };

  const handleFinishWriting = () => {
    setIsWriting(false);
  };

  if (!authState.user) {
    return (
      <Layout>
        <div className="max-w-3xl mx-auto text-center py-16">
          <h1 className="text-3xl font-bold mb-4">Welcome to Journal App</h1>
          <p className="mb-6">Please sign in to start journaling</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-8">
        <SettingsLink />
        
        <div>
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold">Today's Journal</h1>
            
            {!isWriting && (
              <Button onClick={handleCreateNewEntry} className="flex items-center gap-1">
                <Plus className="h-4 w-4" /> New Entry
              </Button>
            )}
          </div>
          
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : isWriting ? (
            <JournalEditor onSave={handleFinishWriting} />
          ) : todayEntries.length > 0 ? (
            <div className="space-y-6">
              {todayEntries.map(entry => (
                <JournalEntryView key={entry.id} entry={entry} />
              ))}
            </div>
          ) : (
            <Card className="p-6 text-center space-y-4 animated-gradient">
              <h2 className="text-xl font-semibold">Start today's journal entry</h2>
              <p className="text-muted-foreground">
                Capture your thoughts, the weather, and what you're listening to.
              </p>
              <Button onClick={handleCreateNewEntry}>
                Write Your First Entry
              </Button>
            </Card>
          )}
        </div>
        
        {pastEntries.length > 0 && (
          <div>
            <h2 className="text-2xl font-semibold mb-4">
              This day in past years
            </h2>
            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-6">
                {pastEntries.map(entry => (
                  <JournalEntryView 
                    key={entry.id} 
                    entry={entry} 
                    isPreview 
                  />
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Index;
