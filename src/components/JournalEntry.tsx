
import React, { useState, useCallback, useRef } from 'react';
import { format, parseISO } from 'date-fns';
import { JournalEntry as JournalEntryType, Mood } from '@/types';
import { cn } from '@/lib/utils';
import { useJournal } from '@/contexts/JournalContext';
import JournalEditorInline from './journal/JournalEditorInline';
import { useToast } from '@/hooks/use-toast';
import CommentSection from './CommentSection';
import SpotifyClipPlayer from './spotify/SpotifyClipPlayer';
import ReflectionModule from './journal/ReflectionModule';
import EntryActions from './journal/EntryActions';
import InteractiveContent from './journal/InteractiveContent';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface JournalEntryProps {
  entry: JournalEntryType;
  className?: string;
  isPreview?: boolean;
}

// Mood labels without emojis
const moodLabels: Record<Mood, string> = {
  'happy': 'Happy',
  'content': 'Content',
  'neutral': 'Neutral',
  'sad': 'Sad',
  'anxious': 'Anxious',
  'angry': 'Angry',
  'emotional': 'Emotional',
  'in-love': 'In Love',
  'excited': 'Excited',
  'tired': 'Tired'
};

const JournalEntryView: React.FC<JournalEntryProps> = ({ 
  entry, 
  className,
  isPreview = false
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [hasClickedToPlay, setHasClickedToPlay] = useState(false);
  const [localContent, setLocalContent] = useState(entry.content);
  const { deleteEntry, addCommentToEntry, deleteCommentFromEntry, updateEntryContent } = useJournal();
  const { toast } = useToast();
  const { authState } = useAuth();
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedContentRef = useRef(entry.content);

  // Update local content when entry changes externally
  React.useEffect(() => {
    if (entry.content !== lastSavedContentRef.current) {
      setLocalContent(entry.content);
      lastSavedContentRef.current = entry.content;
    }
  }, [entry.content]);

  // Handle checklist toggle with immediate save
  const handleContentChange = useCallback((newContent: string) => {
    // Update local state immediately for responsive UI
    setLocalContent(newContent);
    
    // Clear any pending save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Debounce the save to prevent rapid-fire database updates
    saveTimeoutRef.current = setTimeout(async () => {
      if (newContent !== lastSavedContentRef.current) {
        try {
          await updateEntryContent(entry.id, newContent);
          lastSavedContentRef.current = newContent;
        } catch (error) {
          console.error('Error saving checklist state:', error);
          // Revert to last saved content on error
          setLocalContent(lastSavedContentRef.current);
        }
      }
    }, 300);
  }, [entry.id, updateEntryContent]);

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Get user's temperature unit preference
  const { data: userProfile } = useQuery({
    queryKey: ['temperature-settings', authState.user?.id],
    queryFn: async () => {
      if (!authState.user) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('temperature_unit')
        .eq('id', authState.user.id)
        .single();
      
      if (error) {
        console.error('Error fetching temperature preferences:', error);
        return null;
      }
      
      return data;
    },
    enabled: !!authState.user
  });

  // Format temperature based on user preference (stored as Celsius)
  const formatTemperature = (celsius: number): string => {
    const useCelsius = userProfile?.temperature_unit === 'celsius';
    
    if (useCelsius) {
      return `${Math.round(celsius)}°C`;
    } else {
      const fahrenheit = (celsius * 9/5) + 32;
      return `${Math.round(fahrenheit)}°F`;
    }
  };
  
  const parseDate = (dateValue: string | number) => {
    if (!dateValue) return new Date();
    if (typeof dateValue === 'number') return new Date(dateValue);
    if (typeof dateValue === 'string') {
      return dateValue.includes('T') 
        ? parseISO(dateValue) 
        : parseISO(`${dateValue}T00:00:00.000Z`);
    }
    return new Date(dateValue);
  };
  
  const entryDateTime = entry.timestamp 
    ? parseDate(entry.timestamp)
    : parseDate(entry.date);
  
  const formattedDate = format(entryDateTime, 'EEEE, MMMM d');
  const formattedYear = format(entryDateTime, 'yyyy');
  const formattedTime = entry.timestamp 
    ? format(parseDate(entry.timestamp), 'h:mm a')
    : '';
  
  const handleDelete = async () => {
    await deleteEntry(entry.id);
    toast({
      title: "Entry deleted",
      description: "Your journal entry has been permanently deleted."
    });
  };
  
  const handleAddComment = async (content: string) => {
    await addCommentToEntry(entry.id, content);
  };
  
  const handleDeleteComment = async (commentId: string) => {
    await deleteCommentFromEntry(entry.id, commentId);
    toast({
      title: "Note deleted",
      description: "Your note has been permanently deleted."
    });
  };

  const handleReflectionUpdate = async () => {
    // Reflection updates are handled by the ReflectionModule directly
    // This callback is kept for compatibility
  };

  const handleSpotifyPlayerClick = () => {
    setHasClickedToPlay(true);
  };
  
  // For published entries, we use inline editing via the existing edit mode
  // The JournalEditor is now only for new entries/drafts
  if (isEditing) {
    return (
      <JournalEditorInline 
        entry={entry} 
        onSave={() => setIsEditing(false)}
        onCancel={() => setIsEditing(false)}
      />
    );
  }

  return (
    <motion.article 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={cn(
        "bg-card border border-border rounded-md overflow-hidden",
        className
      )}
    >
      {/* Header - Mobile Layout */}
      <div className="sm:hidden px-4 py-4 border-b border-border">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h3 className="font-display text-2xl font-semibold leading-tight text-foreground">{formattedDate}</h3>
            <p className="text-sm text-muted-foreground">{formattedYear}</p>
          </div>
          {!isPreview && (
            <EntryActions
              onEdit={() => setIsEditing(true)}
              onDelete={handleDelete}
            />
          )}
        </div>
        
        <div className="flex items-center gap-2 text-sm mt-3">
          {formattedTime && (
            <span className="text-muted-foreground">{formattedTime}</span>
          )}
          <span className="px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary border border-primary/20">
            {moodLabels[entry.mood] || entry.mood}
          </span>
        </div>
        
        {entry.weather && (
          <div className="flex items-center gap-2 text-sm mt-2 text-muted-foreground">
            <span>{formatTemperature(entry.weather.temperature)}</span>
            {entry.weather.description && (
              <>
                <span>·</span>
                <span className="capitalize">{entry.weather.description}</span>
              </>
            )}
            {entry.weather.location && (
              <>
                <span>·</span>
                <span>{entry.weather.location}</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Header - Desktop Layout */}
      <div className="hidden sm:block px-6 py-5 border-b border-border">
        <div className="flex items-start justify-between">
          {/* Left: Date, Year, Time */}
          <div>
            <h3 className="font-display text-2xl font-semibold leading-tight text-foreground">{formattedDate}</h3>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-sm text-muted-foreground">{formattedYear}</span>
              {formattedTime && (
                <>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-sm text-muted-foreground">{formattedTime}</span>
                </>
              )}
              <span className="px-2.5 py-0.5 text-xs rounded-full bg-primary/10 text-primary border border-primary/20">
                {moodLabels[entry.mood] || entry.mood}
              </span>
              {entry.weather && (
                <>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-sm text-muted-foreground">{formatTemperature(entry.weather.temperature)}</span>
                  {entry.weather.description && (
                    <>
                      <span className="text-muted-foreground">·</span>
                      <span className="text-sm text-muted-foreground capitalize">{entry.weather.description}</span>
                    </>
                  )}
                  {entry.weather.location && (
                    <>
                      <span className="text-muted-foreground">·</span>
                      <span className="text-sm text-muted-foreground">{entry.weather.location}</span>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
          
          {/* Right: Actions */}
          {!isPreview && (
            <EntryActions
              onEdit={() => setIsEditing(true)}
              onDelete={handleDelete}
            />
          )}
        </div>
      </div>

      {/* Spotify Track */}
      {entry.track && (
        <div className="px-6 py-4 border-b border-border bg-accent/20">
          <SpotifyClipPlayer 
            track={entry.track}
            entryId={entry.id}
            clipStartSeconds={entry.track.clipStartSeconds}
            clipEndSeconds={entry.track.clipEndSeconds}
            onPlayStateChange={(playing) => {
              if (playing) setHasClickedToPlay(true);
            }}
          />
        </div>
      )}
      
      {/* Content */}
      <div className="relative">
        <div
          className="px-6 py-6"
          style={{
            filter: entry.track && !hasClickedToPlay ? 'blur(4px)' : 'blur(0px)',
            opacity: entry.track && !hasClickedToPlay ? 0.6 : 1,
            transition: 'filter 0.8s ease, opacity 0.8s ease',
          }}
        >
          <InteractiveContent 
            content={localContent}
            onContentChange={!isPreview ? handleContentChange : undefined}
            disabled={isPreview}
          />
        </div>
        
        {entry.track && !hasClickedToPlay && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-card border border-border px-5 py-2.5 rounded-full text-sm text-muted-foreground shadow-sm">
              Play the song to read
            </div>
          </div>
        )}
      </div>

      {/* Reflection & Comments */}
      {!isPreview && (
        <div
          style={{
            filter: entry.track && !hasClickedToPlay ? 'blur(4px)' : 'blur(0px)',
            opacity: entry.track && !hasClickedToPlay ? 0.6 : 1,
            transition: 'filter 0.8s ease, opacity 0.8s ease',
          }}
        >
          <div className="px-6 pb-4">
            <ReflectionModule
              entryId={entry.id}
              entryContent={entry.content}
              entryMood={entry.mood}
              entryTrack={entry.track}
              reflectionQuestion={entry.reflectionQuestion || null}
              reflectionAnswer={entry.reflectionAnswer || null}
              onReflectionUpdate={handleReflectionUpdate}
            />
          </div>

          <div className="px-6 pb-6 pt-2 border-t border-border">
            <CommentSection
              comments={entry.comments || []}
              onAddComment={handleAddComment}
              onDeleteComment={handleDeleteComment}
            />
          </div>
        </div>
      )}
    </motion.article>
  );
};

export default JournalEntryView;
