import React, { useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { DemoEntry } from '@/data/demoEntries';
import { Mood } from '@/types';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import InteractiveContent from '@/components/journal/InteractiveContent';
import DemoAudioPlayer from './DemoAudioPlayer';
import {
  WeatherOverlay,
  WeatherAnimationButton,
  useWeatherAnimation,
  deriveWeatherCategory,
  deriveTimeOfDay,
} from '@/components/journal/weather-overlay';
import { useRef, useEffect } from 'react';
import { Sparkles, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DemoJournalEntryProps {
  entry: DemoEntry;
  onInteract: () => void;
}

const moodLabels: Record<Mood, string> = {
  happy: 'Happy', content: 'Content', neutral: 'Neutral', sad: 'Sad',
  anxious: 'Anxious', angry: 'Angry', emotional: 'Emotional',
  'in-love': 'In Love', excited: 'Excited', tired: 'Tired',
};

const DemoJournalEntry: React.FC<DemoJournalEntryProps> = ({ entry, onInteract }) => {
  const [hasPlayed, setHasPlayed] = useState(false);
  const [showReflection, setShowReflection] = useState(!!entry.reflectionQuestion);
  const [generatingFakeReflection, setGeneratingFakeReflection] = useState(false);
  const [fakeQuestion, setFakeQuestion] = useState<string | null>(entry.reflectionQuestion || null);
  const articleRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentAreaBounds, setContentAreaBounds] = useState<{ top: number; bottom: number } | undefined>(undefined);

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

  useEffect(() => {
    if (!isWeatherVisible || !articleRef.current || !contentRef.current) {
      setContentAreaBounds(undefined);
      return;
    }
    const articleRect = articleRef.current.getBoundingClientRect();
    const contentRect = contentRef.current.getBoundingClientRect();
    const top = ((contentRect.top - articleRect.top) / articleRect.height) * 100;
    const bottom = ((contentRect.bottom - articleRect.top) / articleRect.height) * 100;
    setContentAreaBounds({ top, bottom });
  }, [isWeatherVisible]);

  const parseDate = (dateValue: string | number) => {
    if (!dateValue) return new Date();
    if (typeof dateValue === 'number') return new Date(dateValue);
    return dateValue.includes('T') ? parseISO(dateValue) : parseISO(`${dateValue}T00:00:00.000Z`);
  };

  const entryDateTime = entry.timestamp ? parseDate(entry.timestamp) : parseDate(entry.date);
  const formattedDate = format(entryDateTime, 'EEEE, MMMM d');
  const formattedYear = format(entryDateTime, 'yyyy');
  const formattedTime = entry.timestamp ? format(parseDate(entry.timestamp), 'h:mm a') : '';

  const formatTemperature = (celsius: number) => {
    const fahrenheit = (celsius * 9 / 5) + 32;
    return `${Math.round(fahrenheit)}°F`;
  };

  const handlePlay = () => {
    setHasPlayed(true);
    onInteract();
  };

  const handleGenerateFakeReflection = () => {
    setGeneratingFakeReflection(true);
    onInteract();
    // Simulate generation delay
    setTimeout(() => {
      setFakeQuestion('What small moment from today are you most grateful for, and why did it stand out?');
      setShowReflection(true);
      setGeneratingFakeReflection(false);
    }, 1800);
  };

  // In demo mode, content is never blurred
  const shouldBlur = false;

  return (
    <motion.article
      ref={articleRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={cn('bg-card border border-border rounded-md overflow-hidden relative')}
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

      {/* Header - Mobile */}
      <div className="sm:hidden px-4 py-4 border-b border-border">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h3 className="font-display text-2xl font-semibold leading-tight text-foreground">{formattedDate}</h3>
            <p className="text-sm text-muted-foreground">{formattedYear}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-3">
          <span className="px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary border border-primary/20">
            {moodLabels[entry.mood] || entry.mood}
          </span>
          {weatherCategory && (
            <WeatherAnimationButton
              isPlaying={isWeatherPlaying}
              onClick={() => { playWeatherAnimation(); onInteract(); }}
              disabled={false}
            />
          )}
        </div>
        {entry.weather && (
          <div className="flex items-center gap-2 text-sm mt-2 text-muted-foreground flex-wrap">
            {formattedTime && <><span>{formattedTime}</span><span>·</span></>}
            <span>{formatTemperature(entry.weather.temperature)}</span>
            {entry.weather.description && <><span>·</span><span className="capitalize">{entry.weather.description}</span></>}
            {entry.weather.location && <><span>·</span><span>{entry.weather.location}</span></>}
          </div>
        )}
      </div>

      {/* Header - Desktop */}
      <div className="hidden sm:block px-6 py-5 border-b border-border">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-display text-2xl font-semibold leading-tight text-foreground">{formattedDate}</h3>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-sm text-muted-foreground">{formattedYear}</span>
              {formattedTime && (
                <><span className="text-muted-foreground">·</span><span className="text-sm text-muted-foreground">{formattedTime}</span></>
              )}
              {entry.weather && (
                <>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-sm text-muted-foreground">{formatTemperature(entry.weather.temperature)}</span>
                  {entry.weather.description && (
                    <><span className="text-muted-foreground">·</span><span className="text-sm text-muted-foreground capitalize">{entry.weather.description}</span></>
                  )}
                  {entry.weather.location && (
                    <><span className="text-muted-foreground">·</span><span className="text-sm text-muted-foreground">{entry.weather.location}</span></>
                  )}
                </>
              )}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className="px-2.5 py-0.5 text-xs rounded-full bg-primary/10 text-primary border border-primary/20">
                {moodLabels[entry.mood] || entry.mood}
              </span>
              {weatherCategory && (
                <WeatherAnimationButton
                  isPlaying={isWeatherPlaying}
                  onClick={() => { playWeatherAnimation(); onInteract(); }}
                  disabled={false}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Audio Player */}
      {entry.demoTrack && (
        <div className="px-6 py-4 border-b border-border bg-accent/20">
          <DemoAudioPlayer
            track={entry.demoTrack}
            onPlay={handlePlay}
          />
        </div>
      )}

      {/* Content */}
      <div className="relative">
        <div ref={contentRef} className="px-6 py-6">
          <InteractiveContent
            content={entry.content}
            disabled={true}
          />
        </div>
      </div>

      {/* Reflection Section */}
      <div className="px-6 pb-4">
        {showReflection && fakeQuestion ? (
          <div className="border border-border rounded-md p-4 mt-4 bg-muted/20">
            <div className="flex flex-col space-y-4">
              <div className="flex items-start gap-2">
                <Sparkles className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <p className="text-sm font-medium text-foreground leading-relaxed">{fakeQuestion}</p>
              </div>
              {entry.reflectionAnswer && (
                <p className="text-sm text-muted-foreground leading-relaxed pl-6 italic">
                  "{entry.reflectionAnswer}"
                </p>
              )}
            </div>
          </div>
        ) : (
          <Button
            onClick={handleGenerateFakeReflection}
            disabled={generatingFakeReflection}
            className="w-full mt-4"
            variant="outline"
          >
            {generatingFakeReflection ? (
              <><RefreshCcw className="animate-spin mr-2 h-4 w-4" />Generating...</>
            ) : (
              <><Sparkles className="mr-2 h-4 w-4" />Generate Reflection Question</>
            )}
          </Button>
        )}
      </div>
    </motion.article>
  );
};

export default DemoJournalEntry;
