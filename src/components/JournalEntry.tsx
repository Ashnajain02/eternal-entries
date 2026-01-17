
import React, { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { JournalEntry as JournalEntryType, Mood } from '@/types';
import { cn } from '@/lib/utils';
import { useJournal } from '@/contexts/JournalContext';
import JournalEditorInline from './journal/JournalEditorInline';
import { useToast } from '@/hooks/use-toast';
import CommentSection from './CommentSection';
import SpotifyPlayer from './spotify/SpotifyPlayer';
import ReflectionModule from './journal/ReflectionModule';
import EntryActions from './journal/EntryActions';
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
  const { deleteEntry, addCommentToEntry, deleteCommentFromEntry, updateEntry } = useJournal();
  const { toast } = useToast();
  const { authState } = useAuth();

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
    const updatedEntry = { ...entry };
    await updateEntry(updatedEntry);
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
      {/* Header */}
      <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-border">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <div>
              <h3 className="font-display text-xl sm:text-2xl font-medium">{formattedDate}</h3>
              <div className="flex items-center gap-2 text-sm sm:text-base text-muted-foreground font-medium">
                <span>{formattedYear}</span>
                {formattedTime && (
                  <>
                    <span>·</span>
                    <span>{formattedTime}</span>
                  </>
                )}
              </div>
            </div>
            <span className="self-start px-2.5 py-1 text-xs rounded-full bg-accent text-accent-foreground">
              {moodLabels[entry.mood] || entry.mood}
            </span>
          </div>
          
          <div className="flex items-center justify-between sm:justify-end gap-3">
            {entry.weather && (
              <div className="flex flex-col text-sm text-right">
                {entry.weather.location && (
                  <span className="text-muted-foreground text-xs">{entry.weather.location}</span>
                )}
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-foreground">{formatTemperature(entry.weather.temperature)}</span>
                  {entry.weather.description && (
                    <>
                      <span className="text-muted-foreground">·</span>
                      <span className="text-muted-foreground capitalize">{entry.weather.description}</span>
                    </>
                  )}
                </div>
              </div>
            )}
            {!isPreview && (
              <EntryActions
                onEdit={() => setIsEditing(true)}
                onDelete={handleDelete}
              />
            )}
          </div>
        </div>
      </div>

      {/* Spotify Track */}
      {entry.track && (
        <div className="px-6 py-4 border-b border-border bg-accent/20">
          <SpotifyPlayer 
            track={entry.track} 
            onPlayerClick={handleSpotifyPlayerClick}
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
          <div 
            className="prose prose-sm max-w-none text-foreground"
            dangerouslySetInnerHTML={{ __html: entry.content }}
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
