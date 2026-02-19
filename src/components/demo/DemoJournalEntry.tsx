import React, { useMemo, useState, useRef, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { DemoEntry } from '@/data/demoEntries';
import { Mood } from '@/types';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import InteractiveContent from '@/components/journal/InteractiveContent';
import DemoAudioPlayer from './DemoAudioPlayer';
import ReflectionQuestion from '@/components/journal/reflection/ReflectionQuestion';
import ReflectionEditor from '@/components/journal/reflection/ReflectionEditor';
import ReflectionDisplay from '@/components/journal/reflection/ReflectionDisplay';
import ReflectionTrigger from '@/components/journal/reflection/ReflectionTrigger';
import { useToast } from '@/hooks/use-toast';
import {
  WeatherOverlay,
  WeatherAnimationButton,
  useWeatherAnimation,
  deriveWeatherCategory,
  deriveTimeOfDay,
} from '@/components/journal/weather-overlay';

interface DemoJournalEntryProps {
  entry: DemoEntry;
  onInteract: () => void;
}

const moodLabels: Record<Mood, string> = {
  happy: 'Happy', content: 'Content', neutral: 'Neutral', sad: 'Sad',
  anxious: 'Anxious', angry: 'Angry', emotional: 'Emotional',
  'in-love': 'In Love', excited: 'Excited', tired: 'Tired',
};

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

async function callDemoReflection(content: string, mood: string, track?: { name: string; artist: string }): Promise<string[]> {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/generate-reflection-demo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content, mood, track }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to generate reflection questions');
  }
  const data = await response.json();
  return data.reflectionQuestions || [];
}

const DemoJournalEntry: React.FC<DemoJournalEntryProps> = ({ entry, onInteract }) => {
  const { toast } = useToast();
  const articleRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentAreaBounds, setContentAreaBounds] = useState<{ top: number; bottom: number } | undefined>(undefined);

  // Reflection state — mirrors ReflectionModule exactly, minus DB writes
  const [isLoading, setIsLoading] = useState(false);
  const [questions, setQuestions] = useState<string[]>(entry.reflectionQuestion ? [entry.reflectionQuestion] : []);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answer, setAnswer] = useState(entry.reflectionAnswer || '');
  const [isEditing, setIsEditing] = useState(false);
  const [showModule, setShowModule] = useState(!!entry.reflectionQuestion);
  const currentQuestion = questions[currentQuestionIndex] || '';

  // Weather
  const hasWeatherData = Boolean(entry.weather?.description);
  const weatherCategory = useMemo(
    () => hasWeatherData ? deriveWeatherCategory(entry.weather!.description) : null,
    [hasWeatherData, entry.weather?.description]
  );
  const timeOfDay = useMemo(
    () => deriveTimeOfDay(entry.timestamp || entry.date),
    [entry.timestamp, entry.date]
  );
  const { isPlaying: isWeatherPlaying, isVisible: isWeatherVisible, opacity: weatherOpacity, phase: weatherPhase, playAnimation: playWeatherAnimation } = useWeatherAnimation(entry.id);

  useEffect(() => {
    if (!isWeatherVisible || !articleRef.current || !contentRef.current) {
      setContentAreaBounds(undefined);
      return;
    }
    const articleRect = articleRef.current.getBoundingClientRect();
    const contentRect = contentRef.current.getBoundingClientRect();
    setContentAreaBounds({
      top: ((contentRect.top - articleRect.top) / articleRect.height) * 100,
      bottom: ((contentRect.bottom - articleRect.top) / articleRect.height) * 100,
    });
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

  const formatTemperature = (celsius: number) => `${Math.round((celsius * 9 / 5) + 32)}°F`;

  // --- Reflection handlers (same logic as ReflectionModule, no DB) ---
  const generateQuestions = async () => {
    setIsLoading(true);
    onInteract();
    try {
      const trackInfo = entry.demoTrack ? { name: entry.demoTrack.name, artist: entry.demoTrack.artist } : undefined;
      const generated = await callDemoReflection(entry.content, entry.mood, trackInfo);
      setQuestions(generated);
      setCurrentQuestionIndex(0);
      setShowModule(true);
      setIsEditing(true);
    } catch (error: any) {
      toast({
        title: 'Error generating reflection',
        description: error.message || 'Could not generate reflection questions. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const cycleQuestion = () => {
    if (questions.length > 1) setCurrentQuestionIndex(prev => (prev + 1) % questions.length);
  };

  // "Save" in demo: just switch to display mode, no DB write
  const saveReflection = () => {
    if (!currentQuestion || !answer.trim()) {
      toast({ title: 'Cannot save empty reflection', description: 'Please write your reflection before saving.', variant: 'destructive' });
      return;
    }
    setIsEditing(false);
  };

  // "Delete" in demo: just reset state, no DB write
  const deleteReflection = () => {
    setQuestions([]);
    setCurrentQuestionIndex(0);
    setAnswer('');
    setShowModule(false);
  };

  const handleClose = () => {
    if (isEditing && answer.trim()) {
      const confirmed = window.confirm('You have an unsaved reflection. Are you sure you want to discard it?');
      if (!confirmed) return;
    }
    if (!entry.reflectionQuestion) {
      setShowModule(false);
    } else {
      setIsEditing(false);
      setQuestions(entry.reflectionQuestion ? [entry.reflectionQuestion] : []);
      setCurrentQuestionIndex(0);
      setAnswer(entry.reflectionAnswer || '');
    }
  };

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
            <WeatherAnimationButton isPlaying={isWeatherPlaying} onClick={() => { playWeatherAnimation(); onInteract(); }} disabled={false} />
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
              {formattedTime && <><span className="text-muted-foreground">·</span><span className="text-sm text-muted-foreground">{formattedTime}</span></>}
              {entry.weather && (
                <>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-sm text-muted-foreground">{formatTemperature(entry.weather.temperature)}</span>
                  {entry.weather.description && <><span className="text-muted-foreground">·</span><span className="text-sm text-muted-foreground capitalize">{entry.weather.description}</span></>}
                  {entry.weather.location && <><span className="text-muted-foreground">·</span><span className="text-sm text-muted-foreground">{entry.weather.location}</span></>}
                </>
              )}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className="px-2.5 py-0.5 text-xs rounded-full bg-primary/10 text-primary border border-primary/20">
                {moodLabels[entry.mood] || entry.mood}
              </span>
              {weatherCategory && (
                <WeatherAnimationButton isPlaying={isWeatherPlaying} onClick={() => { playWeatherAnimation(); onInteract(); }} disabled={false} />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Audio Player */}
      {entry.demoTrack && (
        <div className="px-6 py-4 border-b border-border bg-accent/20">
          <DemoAudioPlayer track={entry.demoTrack} onPlay={onInteract} />
        </div>
      )}

      {/* Content */}
      <div className="relative">
        <div ref={contentRef} className="px-6 py-6">
          <InteractiveContent content={entry.content} disabled={true} />
        </div>
      </div>

      {/* Reflection — identical UI to real app, no DB writes */}
      <div className="px-6 pb-4">
        {!showModule ? (
          <ReflectionTrigger onClick={generateQuestions} isLoading={isLoading} />
        ) : (
          <div className="border border-border rounded-md p-4 mt-4 bg-muted/20">
            <div className="flex flex-col space-y-4">
              <ReflectionQuestion
                question={currentQuestion}
                isEditing={isEditing}
                isLoading={isLoading}
                onRefresh={generateQuestions}
                onCycle={cycleQuestion}
                onClose={handleClose}
                totalQuestions={questions.length}
                currentIndex={currentQuestionIndex}
              />
              {isEditing ? (
                <ReflectionEditor
                  answer={answer}
                  isLoading={isLoading}
                  onChange={setAnswer}
                  onSave={saveReflection}
                />
              ) : (
                <ReflectionDisplay
                  answer={answer}
                  onEdit={() => setIsEditing(true)}
                  onDelete={deleteReflection}
                  isLoading={isLoading}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </motion.article>
  );
};

export default DemoJournalEntry;
