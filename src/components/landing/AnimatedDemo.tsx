import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Music, Calendar, Cloud, CheckCircle2, Sun } from 'lucide-react';
import { format } from 'date-fns';

const AnimatedDemo = () => {
  const [phase, setPhase] = useState(0);
  const [typedText, setTypedText] = useState('');
  const [showCursor, setShowCursor] = useState(true);
  const [weatherPlaying, setWeatherPlaying] = useState(false);
  const [habitsChecked, setHabitsChecked] = useState<number[]>([]);

  // Dynamic date formatting
  const today = useMemo(() => new Date(), []);
  const formattedDate = format(today, 'MMMM d, yyyy');
  const dayOfWeek = format(today, 'EEEE');

  // Journal text for phase 0
  const journalText = "The rain outside matched my mood today—soft, reflective, unhurried. I listened to our song again and remembered that summer...";

  // Habits for phase 2
  const habits = [
    { name: 'Morning journal', id: 0 },
    { name: 'Meditation', id: 1 },
    { name: 'Read 20 pages', id: 2 },
  ];

  // Phase 0: Typing animation with weather
  useEffect(() => {
    if (phase === 0 && typedText.length < journalText.length) {
      const timeout = setTimeout(() => {
        setTypedText(journalText.slice(0, typedText.length + 1));
      }, 40);
      return () => clearTimeout(timeout);
    } else if (phase === 0 && typedText.length === journalText.length) {
      // Show weather overlay after typing
      const weatherTimeout = setTimeout(() => setWeatherPlaying(true), 400);
      const phaseTimeout = setTimeout(() => {
        setWeatherPlaying(false);
        setPhase(1);
      }, 3000);
      return () => {
        clearTimeout(weatherTimeout);
        clearTimeout(phaseTimeout);
      };
    }
  }, [typedText, phase, journalText.length]);

  // Cursor blink
  useEffect(() => {
    const interval = setInterval(() => setShowCursor(prev => !prev), 530);
    return () => clearInterval(interval);
  }, []);

  // Phase 1: Music clip display
  useEffect(() => {
    if (phase === 1) {
      const timeout = setTimeout(() => setPhase(2), 3200);
      return () => clearTimeout(timeout);
    }
  }, [phase]);

  // Phase 2: Habit tracker with sequential checking
  useEffect(() => {
    if (phase === 2 && habitsChecked.length < habits.length) {
      const timeout = setTimeout(() => {
        setHabitsChecked(prev => [...prev, habits[prev.length].id]);
      }, 700);
      return () => clearTimeout(timeout);
    } else if (phase === 2 && habitsChecked.length === habits.length) {
      const timeout = setTimeout(() => {
        setPhase(0);
        setTypedText('');
        setHabitsChecked([]);
      }, 3500);
      return () => clearTimeout(timeout);
    }
  }, [phase, habitsChecked.length, habits.length]);

  return (
    <div className="relative w-full max-w-lg mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.5 }}
        className="bg-card border border-border rounded-xl shadow-lg overflow-hidden"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div className="flex flex-col">
              <span className="text-sm text-foreground font-medium">{formattedDate}</span>
              <span className="text-xs text-muted-foreground">{dayOfWeek}</span>
            </div>
          </div>
          <span className="px-2.5 py-1 text-xs rounded-full bg-accent text-accent-foreground">
            {phase === 2 ? 'Habits' : 'Reflective'}
          </span>
        </div>

        {/* Content area */}
        <div className="p-5 min-h-[300px] relative">
          {/* Weather overlay effect */}
          <AnimatePresence>
            {weatherPlaying && phase === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.6 }}
                className="absolute inset-0 bg-gradient-to-b from-muted/40 to-muted/20 pointer-events-none z-10"
              >
                {/* Rain drops */}
                <div className="absolute inset-0 overflow-hidden">
                  {[...Array(12)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute w-0.5 h-6 bg-gradient-to-b from-transparent via-muted-foreground/40 to-muted-foreground/60 rounded-full"
                      style={{ left: `${8 + i * 8}%` }}
                      initial={{ y: -24, opacity: 0 }}
                      animate={{ y: 320, opacity: [0, 0.7, 0.7, 0] }}
                      transition={{
                        duration: 1.2,
                        delay: i * 0.15,
                        repeat: Infinity,
                        ease: 'linear',
                      }}
                    />
                  ))}
                </div>
                {/* Weather badge */}
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="absolute top-3 right-3 flex items-center gap-1.5 px-2 py-1 bg-background/80 backdrop-blur-sm rounded-full text-xs text-muted-foreground"
                >
                  <Cloud className="h-3 w-3" />
                  <span>14°C · Light rain</span>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {/* Phase 0: Writing with weather */}
            {phase === 0 && (
              <motion.div
                key="writing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="relative z-0"
              >
                <p className="text-foreground leading-relaxed font-body text-base">
                  {typedText}
                  <span className={`inline-block w-0.5 h-5 bg-foreground ml-0.5 -mb-1 ${showCursor ? 'opacity-100' : 'opacity-0'}`} />
                </p>
              </motion.div>
            )}

            {/* Phase 1: Music attachment */}
            {phase === 1 && (
              <motion.div
                key="music"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="space-y-4"
              >
                <p className="text-sm text-muted-foreground italic leading-relaxed">
                  "{journalText}"
                </p>
                
                {/* Song attachment card */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.4 }}
                  className="flex items-center gap-3 p-3 bg-accent/50 rounded-lg border border-border"
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-primary/40 rounded-md flex items-center justify-center">
                    <Music className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">Sunset Lover</p>
                    <p className="text-xs text-muted-foreground truncate">Petit Biscuit</p>
                  </div>
                  <motion.div
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.5 }}
                    className="text-xs text-muted-foreground bg-background/60 px-2 py-1 rounded-full"
                  >
                    1:24 – 2:08
                  </motion.div>
                </motion.div>

                {/* Waveform hint */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="flex items-center justify-center gap-0.5 pt-2"
                >
                  {[...Array(24)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="w-1 bg-primary/40 rounded-full"
                      animate={{
                        height: [8, 16 + Math.sin(i * 0.5) * 8, 8],
                      }}
                      transition={{
                        duration: 0.8,
                        delay: i * 0.03,
                        repeat: Infinity,
                        repeatType: 'reverse',
                      }}
                    />
                  ))}
                </motion.div>

                <p className="text-xs text-center text-muted-foreground mt-2">
                  Clip the exact moment that captures your memory
                </p>
              </motion.div>
            )}

            {/* Phase 2: Habit tracker */}
            {phase === 2 && (
              <motion.div
                key="habits"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="space-y-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Sun className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium text-foreground">Daily Habits</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{habitsChecked.length}/{habits.length} complete</span>
                </div>

                {/* Progress bar */}
                <div className="h-1.5 bg-accent rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-primary rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${(habitsChecked.length / habits.length) * 100}%` }}
                    transition={{ duration: 0.4 }}
                  />
                </div>

                {/* Habit list */}
                <div className="space-y-2 pt-2">
                  {habits.map((habit, index) => {
                    const isChecked = habitsChecked.includes(habit.id);
                    return (
                      <motion.div
                        key={habit.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className={`flex items-center gap-3 p-3 rounded-lg border transition-colors duration-300 ${
                          isChecked 
                            ? 'bg-primary/10 border-primary/30' 
                            : 'bg-accent/30 border-border'
                        }`}
                      >
                        <motion.div
                          animate={{ scale: isChecked ? [1, 1.2, 1] : 1 }}
                          transition={{ duration: 0.3 }}
                        >
                          <CheckCircle2 
                            className={`h-5 w-5 transition-colors duration-300 ${
                              isChecked ? 'text-primary' : 'text-muted-foreground/40'
                            }`}
                          />
                        </motion.div>
                        <span className={`text-sm transition-all duration-300 ${
                          isChecked 
                            ? 'text-foreground' 
                            : 'text-muted-foreground'
                        }`}>
                          {habit.name}
                        </span>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Completion message */}
                <AnimatePresence>
                  {habitsChecked.length === habits.length && (
                    <motion.p
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-center text-sm text-primary font-medium pt-2"
                    >
                      ✨ All habits complete for today
                    </motion.p>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border bg-accent/20">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="italic">Moments preserved, ready to revisit</span>
            <div className="flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                    phase === i ? 'bg-primary scale-125' : 'bg-border'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default AnimatedDemo;
