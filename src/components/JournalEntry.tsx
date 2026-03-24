import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
// date-fns format no longer needed directly — using centralized dateUtils
import { JournalEntry as JournalEntryType } from '@/types';
import { cn } from '@/lib/utils';
import { useJournal } from '@/contexts/JournalContext';
import JournalEditorInline from './journal/JournalEditorInline';

import CommentSection from './CommentSection';
import TrackClipPlayer from './music/TrackClipPlayer';
import ReflectionModule from './journal/ReflectionModule';
import EntryActions from './journal/EntryActions';
import InteractiveContent from './journal/InteractiveContent';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  WeatherOverlay,
  WeatherAnimationButton,
  useWeatherAnimation,
  deriveWeatherCategory,
  deriveTimeOfDay,
} from './journal/weather-overlay';
import EntryPageLayout from './shared/EntryPageLayout';
import { moodLabels } from '@/constants/moods';
import { formatEntryDate, formatEntryYear, formatEntryTime } from '@/utils/dateUtils';
import { formatTemperature } from '@/utils/temperature';

interface JournalEntryProps {
  entry: JournalEntryType;
  className?: string;
  isPreview?: boolean;
  isFullView?: boolean;
  initialWeatherEnabled?: boolean;
  shouldPauseMusic?: boolean;
}


const JournalEntryView: React.FC<JournalEntryProps> = ({
  entry,
  className,
  isPreview = false,
  isFullView = false,
  initialWeatherEnabled,
  shouldPauseMusic,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [hasClickedToPlay, setHasClickedToPlay] = useState(false);
  const [weatherEnabled, setWeatherEnabled] = useState(initialWeatherEnabled ?? true);
  const [localContent, setLocalContent] = useState(entry.content);
  const { deleteEntry, addCommentToEntry, deleteCommentFromEntry, updateEntryContent } = useJournal();
  const { authState } = useAuth();
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedContentRef = useRef(entry.content);
  const articleRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentAreaBounds, setContentAreaBounds] = useState<{ top: number; bottom: number } | undefined>(undefined);

  // Weather overlay state - only for published entries in read mode
  const hasWeatherData = Boolean(entry.weather?.description);
  const weatherCategory = useMemo(
    () => hasWeatherData ? deriveWeatherCategory(entry.weather!.description) : null,
    [hasWeatherData, entry.weather?.description]
  );
  const timeOfDay = useMemo(
    () => deriveTimeOfDay(entry.timestamp || entry.date),
    [entry.timestamp, entry.date]
  );
  
  const {
    isPlaying: isWeatherPlaying,
    isVisible: isWeatherVisible,
    opacity: weatherOpacity,
    phase: weatherPhase,
    playAnimation: playWeatherAnimation,
  } = useWeatherAnimation(entry.id);

  // Calculate content area bounds when weather overlay is visible
  useEffect(() => {
    if (!isWeatherVisible || !articleRef.current || !contentRef.current) {
      setContentAreaBounds(undefined);
      return;
    }
    
    const articleRect = articleRef.current.getBoundingClientRect();
    const contentRect = contentRef.current.getBoundingClientRect();
    
    // Calculate content area bounds as percentage of the article height
    const top = ((contentRect.top - articleRect.top) / articleRect.height) * 100;
    const bottom = ((contentRect.bottom - articleRect.top) / articleRect.height) * 100;
    
    setContentAreaBounds({ top, bottom });
  }, [isWeatherVisible]);

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

  // Get user's profile preferences (temperature unit and blur setting)
  const { data: userProfile } = useQuery({
    queryKey: ['user-profile-settings', authState.user?.id],
    queryFn: async () => {
      if (!authState.user) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('temperature_unit, disable_song_blur')
        .eq('id', authState.user.id)
        .single();
      
      if (error) {
        console.error('Error fetching user preferences:', error);
        return null;
      }
      
      return data;
    },
    enabled: !!authState.user
  });

  // Determine if content should be blurred (respects user preference)
  const shouldBlurContent = useMemo(() => {
    // If user has disabled blur, never blur
    if (userProfile?.disable_song_blur) return false;
    // Otherwise, blur if there's a track and user hasn't clicked to play
    return Boolean(entry.track && !hasClickedToPlay);
  }, [userProfile?.disable_song_blur, entry.track, hasClickedToPlay]);

  const formatTemp = (celsius: number) =>
    formatTemperature(celsius, userProfile?.temperature_unit);
  
  const dateSource = entry.timestamp || entry.date;
  const formattedDate = formatEntryDate(dateSource);
  const formattedYear = formatEntryYear(dateSource);
  const formattedTime = entry.timestamp ? formatEntryTime(entry.timestamp) : '';
  
  const handleDelete = async () => {
    await deleteEntry(entry.id);
  };
  
  const handleAddComment = async (content: string) => {
    await addCommentToEntry(entry.id, content);
  };
  
  const handleDeleteComment = async (commentId: string) => {
    await deleteCommentFromEntry(entry.id, commentId);
  };

  const handleReflectionUpdate = async () => {
    // Reflection updates are handled by the ReflectionModule directly
    // This callback is kept for compatibility
  };

  // Sync weather with intersection observer from parent
  useEffect(() => {
    if (initialWeatherEnabled !== undefined) {
      setWeatherEnabled(initialWeatherEnabled);
    }
  }, [initialWeatherEnabled]);
  
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

  // --- Full-View Layout (editorial journal page) ---
  if (isFullView) {
    const blurStyle = {
      filter: shouldBlurContent ? 'blur(4px)' : 'blur(0px)',
      opacity: shouldBlurContent ? 0.6 : 1,
      transition: 'filter 0.8s ease, opacity 0.8s ease',
    };

    return (
      <EntryPageLayout
        date={entry.date}
        timestamp={entry.timestamp}
        mood={entry.mood}
        weather={entry.weather}
        weatherEnabled={weatherEnabled}
        onWeatherToggle={() => setWeatherEnabled(prev => !prev)}
        formatTemperature={formatTemp}
        actions={!isPreview ? (
          <EntryActions
            onEdit={() => setIsEditing(true)}
            onDelete={handleDelete}
          />
        ) : undefined}
        footer={!isPreview ? (
          <div style={blurStyle}>
            <div className="pb-4">
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
            <div className="pb-6 pt-2">
              <CommentSection
                comments={entry.comments || []}
                onAddComment={handleAddComment}
                onDeleteComment={handleDeleteComment}
              />
            </div>
          </div>
        ) : undefined}
        className={className}
      >
        {/* Spotify Track */}
        {entry.track && (
          <div className="mb-8">
            <TrackClipPlayer
              track={entry.track}
              clipStartSeconds={entry.track.clipStartSeconds}
              clipEndSeconds={entry.track.clipEndSeconds}
              shouldPause={shouldPauseMusic}
              onPlayStateChange={(playing) => {
                if (playing) setHasClickedToPlay(true);
              }}
            />
          </div>
        )}

        {/* Entry content */}
        <div className="relative">
          <div
            ref={contentRef}
            className="text-[1.1rem] leading-[1.9] text-foreground/90"
            style={blurStyle}
          >
            <InteractiveContent
              content={localContent}
              onContentChange={!isPreview ? handleContentChange : undefined}
              disabled={isPreview}
            />
          </div>
          {shouldBlurContent && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-card/80 backdrop-blur-sm border border-border/50 px-5 py-2.5 rounded-full text-sm text-muted-foreground">
                Play the song to read
              </div>
            </div>
          )}
        </div>
      </EntryPageLayout>
    );
  }

  // --- Card Layout (used on Memories page, etc.) ---
  return (
    <motion.article
      ref={articleRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={cn(
        "overflow-hidden relative bg-card border border-border rounded-md",
        className
      )}
    >
      {/* Weather Overlay */}
      {weatherCategory && (
        <WeatherOverlay
          category={weatherCategory}
          timeOfDay={timeOfDay}
          isVisible={isWeatherVisible}
          opacity={weatherOpacity}
          phase={weatherPhase}
          contentAreaBounds={contentAreaBounds}
        />
      )}

      {/* Header — Mobile */}
      <div className="sm:hidden px-4 py-4 border-b border-border">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h3 className="font-display text-2xl font-semibold leading-tight text-foreground">{formattedDate}</h3>
            <p className="text-sm text-muted-foreground">{formattedYear}</p>
          </div>
          {!isPreview && (
            <EntryActions onEdit={() => setIsEditing(true)} onDelete={handleDelete} />
          )}
        </div>
        <div className="flex items-center gap-2 mt-3">
          <span className="px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary border border-primary/20">
            {moodLabels[entry.mood] || entry.mood}
          </span>
          {!isPreview && weatherCategory && (
            <WeatherAnimationButton isPlaying={isWeatherPlaying} onClick={playWeatherAnimation} disabled={Boolean(entry.track && !hasClickedToPlay)} />
          )}
        </div>
        {entry.weather && (
          <div className="flex items-center gap-2 text-sm mt-2 text-muted-foreground flex-wrap">
            {formattedTime && (<><span>{formattedTime}</span><span>·</span></>)}
            <span>{formatTemp(entry.weather.temperature)}</span>
            {entry.weather.description && (<><span>·</span><span className="capitalize">{entry.weather.description}</span></>)}
            {entry.weather.location && (<><span>·</span><span>{entry.weather.location}</span></>)}
          </div>
        )}
        {!entry.weather && formattedTime && (
          <div className="text-sm mt-2 text-muted-foreground">{formattedTime}</div>
        )}
      </div>

      {/* Header — Desktop */}
      <div className="hidden sm:block px-6 py-5 border-b border-border">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-display text-2xl font-semibold leading-tight text-foreground">{formattedDate}</h3>
            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
              <span>{formattedYear}</span>
              {formattedTime && (<><span>·</span><span>{formattedTime}</span></>)}
              {entry.weather && (
                <>
                  <span>·</span><span>{formatTemp(entry.weather.temperature)}</span>
                  {entry.weather.description && (<><span>·</span><span className="capitalize">{entry.weather.description}</span></>)}
                  {entry.weather.location && (<><span>·</span><span>{entry.weather.location}</span></>)}
                </>
              )}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className="px-2.5 py-0.5 text-xs rounded-full bg-primary/10 text-primary border border-primary/20">
                {moodLabels[entry.mood] || entry.mood}
              </span>
              {!isPreview && weatherCategory && (
                <WeatherAnimationButton isPlaying={isWeatherPlaying} onClick={playWeatherAnimation} disabled={Boolean(entry.track && !hasClickedToPlay)} />
              )}
            </div>
          </div>
          {!isPreview && (
            <EntryActions onEdit={() => setIsEditing(true)} onDelete={handleDelete} />
          )}
        </div>
      </div>

      {/* Spotify Track */}
      {entry.track && (
        <div className="px-6 py-4 border-b border-border bg-accent/20">
          <TrackClipPlayer
            track={entry.track}
            clipStartSeconds={entry.track.clipStartSeconds}
            clipEndSeconds={entry.track.clipEndSeconds}
            onPlayStateChange={(playing) => { if (playing) setHasClickedToPlay(true); }}
          />
        </div>
      )}

      {/* Content */}
      <div className="relative">
        <div ref={contentRef} className="px-6 py-6" style={{ filter: shouldBlurContent ? 'blur(4px)' : 'blur(0px)', opacity: shouldBlurContent ? 0.6 : 1, transition: 'filter 0.8s ease, opacity 0.8s ease' }}>
          <InteractiveContent content={localContent} onContentChange={!isPreview ? handleContentChange : undefined} disabled={isPreview} />
        </div>
        {shouldBlurContent && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-card border border-border px-5 py-2.5 rounded-full text-sm text-muted-foreground shadow-sm">Play the song to read</div>
          </div>
        )}
      </div>

      {/* Reflection & Comments */}
      {!isPreview && (
        <div style={{ filter: shouldBlurContent ? 'blur(4px)' : 'blur(0px)', opacity: shouldBlurContent ? 0.6 : 1, transition: 'filter 0.8s ease, opacity 0.8s ease' }}>
          <div className="px-6 pb-4">
            <ReflectionModule entryId={entry.id} entryContent={entry.content} entryMood={entry.mood} entryTrack={entry.track} reflectionQuestion={entry.reflectionQuestion || null} reflectionAnswer={entry.reflectionAnswer || null} onReflectionUpdate={handleReflectionUpdate} />
          </div>
          <div className="px-6 pb-6 pt-2 border-t border-border">
            <CommentSection comments={entry.comments || []} onAddComment={handleAddComment} onDeleteComment={handleDeleteComment} />
          </div>
        </div>
      )}
    </motion.article>
  );
};

export default JournalEntryView;
