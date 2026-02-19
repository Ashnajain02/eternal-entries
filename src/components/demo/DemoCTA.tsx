import React from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DemoCTAProps {
  visible: boolean;
}

const DemoCTA: React.FC<DemoCTAProps> = ({ visible }) => {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4"
        >
          <div className="bg-card border border-border rounded-xl shadow-lg px-5 py-4 flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground leading-snug">
                Create your own timeline
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Your entries, your music, your life.
              </p>
            </div>
            <Button
              asChild
              size="sm"
              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-4 flex-shrink-0 group"
            >
              <Link to="/auth?tab=signup" className="flex items-center gap-1.5">
                Start free
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default DemoCTA;
