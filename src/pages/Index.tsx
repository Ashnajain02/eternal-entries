
import React, { useState, useEffect } from 'react';
import { useJournal } from '@/contexts/JournalContext';
import Layout from '@/components/Layout';
import JournalEditor from '@/components/JournalEditor';
import JournalEntryView from '@/components/JournalEntry';
import LandingPage from '@/components/landing/LandingPage';
import { Button } from '@/components/ui/button';
import { Plus, Loader2, BookOpen } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';

const DRAFT_STORAGE_KEY = 'journal_draft_entry';
const SPOTIFY_REDIRECT_KEY = 'spotify_redirect_from_journal';

const Index = () => {
  const { authState } = useAuth();
  const [isWriting, setIsWriting] = useState(false);
  const location = useLocation();
  
  // Always call useJournal but only use its values when authenticated
  const journalContext = useJournal();
  const entries = authState.user ? (journalContext?.entries || []) : [];
  const isLoading = authState.user ? (journalContext?.isLoading || false) : false;
  const createNewEntry = journalContext?.createNewEntry;
  
  useEffect(() => {
    const checkForDraft = () => {
      if (authState.user && !isWriting) {
        try {
          const redirectSource = localStorage.getItem(SPOTIFY_REDIRECT_KEY);
          if (redirectSource === 'journal_editor') {
            setIsWriting(true);
            return;
          }
          
          const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
          if (savedDraft) {
            const parsedDraft = JSON.parse(savedDraft);
            const today = new Date().toLocaleDateString('en-CA');
            if (parsedDraft && parsedDraft.date === today && parsedDraft.content?.trim()) {
              setIsWriting(true);
            }
          }
        } catch (e) {
          console.error("Error parsing saved draft:", e);
          localStorage.removeItem(DRAFT_STORAGE_KEY);
        }
      }
    };
    
    const timer = setTimeout(checkForDraft, 100);
    return () => clearTimeout(timer);
  }, [authState.user, location, isWriting]);
  
  const handleCreateNewEntry = () => {
    setIsWriting(true);
  };

  const handleFinishWriting = () => {
    setIsWriting(false);
  };

  if (!authState.user) {
    return <LandingPage />;
  }

  if (authState.loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  const sortedEntries = [...entries].sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center justify-between mb-10"
        >
          <h1 className="font-display text-4xl">Journal</h1>
          
          {!isWriting && (
            <Button 
              onClick={handleCreateNewEntry} 
              className="bg-foreground text-background hover:bg-foreground/90 rounded-full px-5"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Entry
            </Button>
          )}
        </motion.div>
        
        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : isWriting ? (
          <JournalEditor onSave={handleFinishWriting} />
        ) : sortedEntries.length > 0 ? (
          <div className="space-y-6">
            {sortedEntries.map((entry, index) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
              >
                <JournalEntryView entry={entry} />
              </motion.div>
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center py-20"
          >
            <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center mx-auto mb-6">
              <BookOpen className="h-7 w-7 text-muted-foreground" />
            </div>
            <h2 className="font-display text-2xl mb-3">Start your journal</h2>
            <p className="text-muted-foreground mb-8 max-w-sm mx-auto">
              Capture your thoughts, moods, and the music you're listening to. 
              Your future self will thank you.
            </p>
            <Button 
              onClick={handleCreateNewEntry}
              className="bg-foreground text-background hover:bg-foreground/90 rounded-full px-6"
            >
              Write Your First Entry
            </Button>
          </motion.div>
        )}
      </div>
    </Layout>
  );
};

export default Index;
