
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Music, Calendar } from 'lucide-react';

const journalText = "Today I realized how far I've come. Looking back at where I was a year ago, I barely recognize that version of myself. The growth has been slow but undeniable...";

const pastEntries = [
  { year: "2025", text: "Still figuring things out, but I'm hopeful about what's ahead.", mood: "Content" },
  { year: "2024", text: "Everything feels uncertain right now. I hope future me has more answers.", mood: "Anxious" },
  { year: "2023", text: "Just started this journey. Nervous but excited to see where it leads.", mood: "Excited" },
];

const AnimatedDemo = () => {
  const [phase, setPhase] = useState(0);
  const [typedText, setTypedText] = useState('');
  const [showCursor, setShowCursor] = useState(true);
  const [visibleEntries, setVisibleEntries] = useState(0);

  useEffect(() => {
    if (phase === 0 && typedText.length < journalText.length) {
      const timeout = setTimeout(() => {
        setTypedText(journalText.slice(0, typedText.length + 1));
      }, 35);
      return () => clearTimeout(timeout);
    } else if (phase === 0 && typedText.length === journalText.length) {
      const timeout = setTimeout(() => setPhase(1), 1500);
      return () => clearTimeout(timeout);
    }
  }, [typedText, phase]);

  useEffect(() => {
    const interval = setInterval(() => setShowCursor(prev => !prev), 530);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (phase === 1) {
      const timeout = setTimeout(() => setPhase(2), 2500);
      return () => clearTimeout(timeout);
    }
  }, [phase]);

  useEffect(() => {
    if (phase === 2 && visibleEntries < pastEntries.length) {
      const timeout = setTimeout(() => {
        setVisibleEntries(prev => prev + 1);
      }, 600);
      return () => clearTimeout(timeout);
    } else if (phase === 2 && visibleEntries === pastEntries.length) {
      const timeout = setTimeout(() => {
        setPhase(0);
        setTypedText('');
        setVisibleEntries(0);
      }, 4000);
      return () => clearTimeout(timeout);
    }
  }, [phase, visibleEntries]);

  return (
    <div className="relative w-full max-w-lg mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.5 }}
        className="bg-card border border-border rounded-lg shadow-sm overflow-hidden"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">January 17, 2026</span>
          </div>
          <span className="px-2.5 py-1 text-xs rounded-full bg-accent text-accent-foreground">
            Reflective
          </span>
        </div>

        {/* Content area */}
        <div className="p-5 min-h-[280px]">
          <AnimatePresence mode="wait">
            {phase === 0 && (
              <motion.div
                key="writing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <p className="text-foreground leading-relaxed font-body">
                  {typedText}
                  <span className={`inline-block w-0.5 h-5 bg-foreground ml-0.5 -mb-1 ${showCursor ? 'opacity-100' : 'opacity-0'}`} />
                </p>
              </motion.div>
            )}

            {phase === 1 && (
              <motion.div
                key="spotify"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.4 }}
                className="space-y-4"
              >
                <p className="text-foreground leading-relaxed font-body text-sm opacity-60">
                  {journalText}
                </p>
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3, duration: 0.4 }}
                  className="flex items-center gap-3 p-3 bg-accent/50 rounded-md border border-border"
                >
                  <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                    <Music className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">Sunset Lover</p>
                    <p className="text-xs text-muted-foreground truncate">Petit Biscuit</p>
                  </div>
                  <span className="text-xs text-muted-foreground">Playing</span>
                </motion.div>
              </motion.div>
            )}

            {phase === 2 && (
              <motion.div
                key="past"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                  <Calendar className="h-4 w-4" />
                  <span className="font-display italic">On this day in previous years...</span>
                </div>
                
                {pastEntries.map((entry, index) => (
                  <motion.div
                    key={entry.year}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ 
                      opacity: index < visibleEntries ? 1 : 0,
                      x: index < visibleEntries ? 0 : -20
                    }}
                    transition={{ duration: 0.4 }}
                    className="p-3 bg-accent/30 rounded-md border-l-2 border-primary/40"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-muted-foreground">{entry.year}</span>
                      <span className="px-2 py-0.5 text-xs rounded-full bg-accent text-accent-foreground">
                        {entry.mood}
                      </span>
                    </div>
                    <p className="text-sm text-foreground/80 italic">"{entry.text}"</p>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border bg-accent/20">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Your journey, captured</span>
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${
                    phase === i ? 'bg-foreground' : 'bg-border'
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
