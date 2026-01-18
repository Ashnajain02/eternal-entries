import React, { useState, useEffect } from 'react';
import { useJournal } from '@/contexts/JournalContext';
import Layout from '@/components/Layout';
import JournalEditor from '@/components/JournalEditor';
import JournalEntryView from '@/components/JournalEntry';
import LandingPage from '@/components/landing/LandingPage';
import DraftsList from '@/components/journal/DraftsList';
import { Button } from '@/components/ui/button';
import { Plus, Loader2, BookOpen } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useDrafts } from '@/contexts/DraftsContext';
import { JournalEntry } from '@/types';

const SPOTIFY_REDIRECT_KEY = 'spotify_redirect_from_journal';

const Index = () => {
  const { authState } = useAuth();
  const [isWriting, setIsWriting] = useState(false);
  const [editingDraft, setEditingDraft] = useState<JournalEntry | null>(null);
  const location = useLocation();
  
  const journalContext = useJournal();
  const entries = authState.user ? (journalContext?.entries || []) : [];
  const isLoading = authState.user ? (journalContext?.isLoading || false) : false;
  
  const { drafts, isLoadingDrafts, deleteDraft } = useDrafts();
  
  // Check for Spotify redirect to restore editor
  useEffect(() => {
    if (authState.user && !isWriting) {
      const redirectSource = localStorage.getItem(SPOTIFY_REDIRECT_KEY);
      if (redirectSource === 'journal_editor') {
        localStorage.removeItem(SPOTIFY_REDIRECT_KEY);
        setIsWriting(true);
      }
    }
  }, [authState.user, location, isWriting]);
  
  const handleCreateNewEntry = () => {
    setEditingDraft(null);
    setIsWriting(true);
  };

  const handleEditDraft = (draftId: string) => {
    const draft = drafts.find(d => d.id === draftId);
    if (draft) {
      setEditingDraft(draft);
      setIsWriting(true);
    }
  };

  const handleFinishWriting = () => {
    setIsWriting(false);
    setEditingDraft(null);
  };

  const handleDeleteDraft = async (draftId: string) => {
    await deleteDraft(draftId);
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
          <h1 className="font-display text-4xl text-primary">Journal</h1>
          
          {!isWriting && (
            <Button 
              onClick={handleCreateNewEntry} 
              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-5"
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
          <JournalEditor 
            initialDraft={editingDraft || undefined} 
            onComplete={handleFinishWriting} 
          />
        ) : (
          <>
            {/* Drafts Section */}
            <DraftsList
              drafts={drafts}
              onEditDraft={handleEditDraft}
              onDeleteDraft={handleDeleteDraft}
              isLoading={isLoadingDrafts}
            />

            {/* Published Entries */}
            {sortedEntries.length > 0 ? (
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
            ) : drafts.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="text-center py-20"
              >
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                  <BookOpen className="h-7 w-7 text-primary" />
                </div>
                <h2 className="font-display text-2xl mb-3 text-primary">Start your journal</h2>
                <p className="text-muted-foreground mb-8 max-w-sm mx-auto">
                  Capture your thoughts, moods, and the music you're listening to. 
                  Your future self will thank you.
                </p>
                <Button 
                  onClick={handleCreateNewEntry}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-6"
                >
                  Write Your First Entry
                </Button>
              </motion.div>
            ) : null}
          </>
        )}
      </div>
    </Layout>
  );
};

export default Index;
