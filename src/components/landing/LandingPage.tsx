
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

const LandingPage = () => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Decorative Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {/* Large circle - top right */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full border border-border/40"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.5, delay: 0.2, ease: "easeOut" }}
          className="absolute -top-24 -right-24 w-[400px] h-[400px] rounded-full border border-border/30"
        />
        
        {/* Small circle - bottom left */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1.2, delay: 0.5, ease: "easeOut" }}
          className="absolute bottom-32 -left-16 w-[200px] h-[200px] rounded-full bg-accent/30"
        />
        
        {/* Floating line elements */}
        <motion.div
          initial={{ opacity: 0, width: 0 }}
          animate={{ opacity: 1, width: '200px' }}
          transition={{ duration: 1, delay: 0.8, ease: "easeOut" }}
          className="absolute top-1/3 left-[10%] h-px bg-border"
        />
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: '150px' }}
          transition={{ duration: 1, delay: 1, ease: "easeOut" }}
          className="absolute top-[20%] right-[15%] w-px bg-border"
        />
      </div>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="container py-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex items-center justify-between"
          >
            <span className="font-display text-2xl tracking-tight">Eternal Entries</span>
            <Link to="/auth">
              <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
                Sign In
              </Button>
            </Link>
          </motion.div>
        </header>

        {/* Hero Section */}
        <main className="flex-1 container flex flex-col justify-center py-20">
          <div className="max-w-3xl">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <span className="text-sm uppercase tracking-[0.2em] text-muted-foreground mb-6 block">
                A personal journal
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="font-display text-5xl md:text-7xl lg:text-8xl leading-[0.95] tracking-tight mb-8"
            >
              Capture moments.
              <br />
              <span className="text-muted-foreground">Reflect deeply.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="text-lg md:text-xl text-muted-foreground max-w-xl mb-12 leading-relaxed"
            >
              A quiet space to write, remember, and grow. Track your moods, 
              anchor memories with music, and watch your story unfold over time.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.7 }}
              className="flex flex-col sm:flex-row gap-4"
            >
              <Button 
                asChild 
                size="lg" 
                className="bg-foreground text-background hover:bg-foreground/90 rounded-full px-8 group"
              >
                <Link to="/auth?tab=signup" className="flex items-center gap-2">
                  Begin Writing
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
            </motion.div>
          </div>
        </main>

        {/* Bottom Section - Features hint */}
        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1 }}
          className="container pb-12"
        >
          <div className="flex flex-wrap gap-x-12 gap-y-4 text-sm text-muted-foreground">
            <span>Mood Tracking</span>
            <span className="text-border">·</span>
            <span>Weather Context</span>
            <span className="text-border">·</span>
            <span>Spotify Integration</span>
            <span className="text-border">·</span>
            <span>AI Reflections</span>
          </div>
        </motion.footer>
      </div>

      {/* Animated Quote */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.5, delay: 1.2 }}
        className="fixed bottom-8 right-8 max-w-xs text-right hidden lg:block"
      >
        <p className="font-display text-lg italic text-muted-foreground/60 leading-relaxed">
          "The unexamined life is not worth living."
        </p>
        <p className="text-xs text-muted-foreground/40 mt-2 tracking-wide">— Socrates</p>
      </motion.div>
    </div>
  );
};

export default LandingPage;
