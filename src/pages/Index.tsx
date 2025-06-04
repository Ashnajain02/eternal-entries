import React, { useState, useEffect } from 'react';
import { useJournal } from '@/contexts/JournalContext';
import Layout from '@/components/Layout';
import JournalEditor from '@/components/JournalEditor';
import JournalEntryView from '@/components/JournalEntry';
import LandingPage from '@/components/landing/LandingPage';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Plus, Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'react-router-dom';

// Keys for storage
const DRAFT_STORAGE_KEY = 'journal_draft_entry';
const SPOTIFY_REDIRECT_KEY = 'spotify_redirect_from_journal';

const Index = () => {
  const { entries, isLoading, createNewEntry } = useJournal();
  const { authState } = useAuth();
  const [isWriting, setIsWriting] = useState(false);
  const location = useLocation();
  
  // Check for existing draft on component mount
  useEffect(() => {
    const checkForDraft = () => {
      // Only check for drafts if authenticated and not already in writing mode
      if (authState.user && !isWriting) {
        try {
          // Check if we're returning from Spotify auth
          const redirectSource = localStorage.getItem(SPOTIFY_REDIRECT_KEY);
          if (redirectSource === 'journal_editor') {
            // Automatically return to writing mode
            setIsWriting(true);
            return;
          }
          
          // Otherwise, check for regular drafts
          const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
          if (savedDraft) {
            const parsedDraft = JSON.parse(savedDraft);
            
            // Verify it's from today to avoid showing old drafts
            // Using en-CA locale to get YYYY-MM-DD format
            const today = new Date().toLocaleDateString('en-CA');
            if (parsedDraft && parsedDraft.date === today && parsedDraft.content?.trim()) {
              console.log("Found valid draft from today, entering writing mode");
              setIsWriting(true);
            }
          }
        } catch (e) {
          console.error("Error parsing saved draft:", e);
          localStorage.removeItem(DRAFT_STORAGE_KEY);
        }
      }
    };
    
    // Small delay to ensure auth state is properly loaded
    const timer = setTimeout(checkForDraft, 100);
    return () => clearTimeout(timer);
  }, [authState.user, location]);
  
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

  // Show landing page for non-authenticated users
  if (!authState.user) {
    return <LandingPage />;
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
              {sortedEntries.map(entry => {
                console.log(`Entry ${entry.id} has track:`, !!entry.track);
                return (
                  <JournalEntryView key={entry.id} entry={entry} />
                );
              })}
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
