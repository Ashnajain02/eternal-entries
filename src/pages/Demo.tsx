import React, { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, BookOpen, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Layout from '@/components/Layout';
import DemoJournalEntry from '@/components/demo/DemoJournalEntry';
import DemoCTA from '@/components/demo/DemoCTA';
import { DEMO_ENTRIES } from '@/data/demoEntries';

// Sort newest first
const sortedDemoEntries = [...DEMO_ENTRIES].sort(
  (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
);

const Demo = () => {
  const [hasInteracted, setHasInteracted] = useState(false);
  const [interactionCount, setInteractionCount] = useState(0);

  const handleInteract = useCallback(() => {
    setInteractionCount(prev => {
      const next = prev + 1;
      // Show CTA after first real interaction
      if (next >= 1) setHasInteracted(true);
      return next;
    });
  }, []);

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        {/* Header - identical to real app */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center justify-between mb-6"
        >
          <div>
            <h1 className="font-display text-4xl text-foreground font-semibold">Journal</h1>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary/60 animate-pulse" />
              Demo Mode — your data stays private
            </p>
          </div>

          {/* Write button is decorative in demo - clicks trigger CTA */}
          <Button
            onClick={() => {
              setHasInteracted(true);
            }}
            asChild
            className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-5"
          >
            <Link to="/auth?tab=signup" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              New Entry
            </Link>
          </Button>
        </motion.div>

        {/* Demo banner */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-8 px-4 py-3 rounded-md border border-border bg-accent/40 flex items-center justify-between gap-4"
        >
          <div className="flex items-start gap-3">
            <BookOpen className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">
                This is a live demo with sample entries across 2023–2026.
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Play songs, trigger weather animations, generate a reflection. No account needed.
              </p>
            </div>
          </div>
          <Button
            asChild
            size="sm"
            variant="outline"
            className="rounded-full flex-shrink-0 group"
          >
            <Link to="/auth?tab=signup" className="flex items-center gap-1.5">
              Start journaling
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </Button>
        </motion.div>

        {/* "On This Day" label */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="mb-4"
        >
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
            On this day — across the years
          </p>
        </motion.div>

        {/* Demo Entries */}
        <div className="space-y-6">
          {sortedDemoEntries.map((entry, index) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.15 + index * 0.08 }}
            >
              <DemoJournalEntry entry={entry} onInteract={handleInteract} />
            </motion.div>
          ))}
        </div>

        {/* Bottom CTA (inline, after entries) */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-12 text-center pb-8"
        >
          <p className="text-muted-foreground text-sm mb-4">
            These entries belong to a demo account. Your real journal is private and encrypted.
          </p>
          <Button
            asChild
            size="lg"
            className="bg-foreground text-background hover:bg-foreground/90 rounded-full px-8 group"
          >
            <Link to="/auth?tab=signup" className="flex items-center gap-2">
              Create your own timeline
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
        </motion.div>
      </div>

      {/* Floating CTA - appears after first interaction */}
      <DemoCTA visible={hasInteracted} />
    </Layout>
  );
};

export default Demo;
