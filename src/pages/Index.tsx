
import React, { useState } from 'react';
import { useJournal } from '@/contexts/JournalContext';
import Layout from '@/components/Layout';
import JournalEditor from '@/components/JournalEditor';
import JournalEntryView from '@/components/JournalEntry';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Plus, Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';

const Index = () => {
  const { entries, isLoading } = useJournal();
  const { authState } = useAuth();
  const [isWriting, setIsWriting] = useState(false);
  
  const handleCreateNewEntry = () => {
    setIsWriting(true);
  };

  const handleFinishWriting = () => {
    setIsWriting(false);
  };

  // Sort entries by timestamp, most recent first
  const sortedEntries = [...entries].sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  if (!authState.user) {
    return (
      <Layout>
        <div className="max-w-3xl mx-auto text-center py-16">
          <h1 className="text-3xl font-bold mb-4">Welcome to Eternal Entries</h1>
          <p className="mb-6">Please sign in to start journaling</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-8">
        <div>
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold">Journal</h1>
            
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
          ) : sortedEntries.length > 0 ? (
            <div className="space-y-6">
              {sortedEntries.map(entry => (
                <JournalEntryView key={entry.id} entry={entry} />
              ))}
            </div>
          ) : (
            <Card className="p-6 text-center space-y-4 animated-gradient">
              <h2 className="text-xl font-semibold">Start your journal</h2>
              <p className="text-muted-foreground">
                Capture your thoughts, the weather, and what you're listening to.
              </p>
              <Button onClick={handleCreateNewEntry}>
                Write Your First Entry
              </Button>
            </Card>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Index;
