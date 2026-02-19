import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { ArrowRight, Music, Cloud, ListChecks, Play, Lock, ShieldCheck, Eye, KeyRound } from 'lucide-react';
import AnimatedDemo from './AnimatedDemo';

const LandingPage = () => {
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
      <div className="relative z-10">
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
        <main className="container py-16 lg:py-24">
          <div className="flex flex-col items-center gap-12 lg:gap-16">
            {/* Text Content */}
            <div className="max-w-2xl text-center">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
              >
                <span className="text-sm uppercase tracking-[0.2em] text-muted-foreground mb-6 block">
                  A journaling experience
                </span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.3 }}
                className="font-display text-5xl md:text-6xl lg:text-7xl leading-[1.05] tracking-tight mb-8"
              >
                <span className="text-foreground">Eternal </span>
                <span className="text-muted-foreground">Entries</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.5 }}
                className="text-base md:text-lg text-muted-foreground max-w-lg mx-auto mb-8 leading-relaxed"
              >
                A journal you don't just write in—you return to.
                <span className="mt-2 block">
                  Pair your entries with the song playing and the weather outside.
                  When you revisit them, you don't just read—you feel.
                </span>
              </motion.p>

              {/* Key feature callouts */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.6 }}
                className="flex flex-col sm:flex-row justify-center gap-4 sm:gap-6 mb-10 text-sm"
              >
                <div className="flex items-center justify-center gap-2">
                  <Music className="h-4 w-4 text-primary" />
                  <span className="text-foreground">Song clips</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <Cloud className="h-4 w-4 text-primary" />
                  <span className="text-foreground">Weather context</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <ListChecks className="h-4 w-4 text-primary" />
                  <span className="text-foreground">Habit tracking</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <Lock className="h-4 w-4 text-primary" />
                  <span className="text-foreground">End-to-end encrypted</span>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.7 }}
                className="flex flex-col sm:flex-row items-center justify-center gap-3"
              >
                <Button 
                  asChild 
                  size="lg" 
                  className="bg-foreground text-background hover:bg-foreground/90 rounded-full px-8 group"
                >
                  <Link to="/auth?tab=signup" className="flex items-center gap-2">
                    Start Your Journey
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="rounded-full px-8 group"
                >
                  <Link to="/demo" className="flex items-center gap-2">
                    <Play className="h-4 w-4" />
                    Try the demo
                  </Link>
                </Button>
              </motion.div>
            </div>

            {/* Animated Demo - Below text */}
            <div className="w-full max-w-lg">
              <AnimatedDemo />
            </div>
          </div>
        </main>

        {/* Value Proposition Section */}
        <section className="container py-20 border-t border-border">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="max-w-3xl mx-auto text-center"
          >
            <h2 className="font-display text-3xl md:text-4xl mb-6">
              Your past self has wisdom to share
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed mb-12">
              Most journals collect dust. Eternal Entries brings your words back to life. 
              Every day, you'll see what you wrote on this day in previous years—creating 
              a conversation across time with yourself.
            </p>

            <div className="grid md:grid-cols-3 gap-8 text-left">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="space-y-3"
              >
                <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center">
                  <span className="font-display text-lg">1</span>
                </div>
                <h3 className="font-display text-xl">Write</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Capture your thoughts with the music you're hearing and the weather you're feeling.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="space-y-3"
              >
                <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center">
                  <span className="font-display text-lg">2</span>
                </div>
                <h3 className="font-display text-xl">Revisit</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Experience past entries—not just read them. Play the song. See the weather. 
                  Remember how it felt.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="space-y-3"
              >
                <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center">
                  <span className="font-display text-lg">3</span>
                </div>
                <h3 className="font-display text-xl">Grow</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Track daily habits. Watch patterns emerge. 
                  Celebrate how far you've come.
                </p>
              </motion.div>
            </div>
          </motion.div>
        </section>

        {/* Privacy & Encryption Section */}
        <section className="container py-20 border-t border-border">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="max-w-3xl mx-auto"
          >
            <div className="text-center mb-12">
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-accent/40 text-sm mb-6"
              >
                <ShieldCheck className="h-4 w-4 text-primary" />
                <span className="text-foreground font-medium">Privacy First, Always</span>
              </motion.div>
              <h2 className="font-display text-3xl md:text-4xl mb-4">
                Your thoughts are yours alone
              </h2>
              <p className="text-muted-foreground text-lg leading-relaxed max-w-xl mx-auto">
                Every journal entry is encrypted directly in your browser before it ever touches our servers. 
                We literally cannot read your diary.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="rounded-xl border border-border bg-card p-6 space-y-3"
              >
                <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center">
                  <KeyRound className="h-5 w-5 text-foreground" />
                </div>
                <h3 className="font-display text-lg">AES-256 Encryption</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Military-grade AES-256-GCM encryption protects every word you write. The same standard used by banks and governments.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="rounded-xl border border-border bg-card p-6 space-y-3"
              >
                <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center">
                  <Lock className="h-5 w-5 text-foreground" />
                </div>
                <h3 className="font-display text-lg">Client-Side Only</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Encryption and decryption happen entirely in your browser. Your key never leaves your device—only encrypted data is stored.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="rounded-xl border border-border bg-card p-6 space-y-3"
              >
                <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center">
                  <Eye className="h-5 w-5 text-foreground" />
                </div>
                <h3 className="font-display text-lg">Zero Knowledge</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Even we cannot read your entries. No data mining, no AI training on your words, no exceptions. Your privacy is absolute.
                </p>
              </motion.div>
            </div>
          </motion.div>
        </section>

        {/* Features Footer */}
        <motion.footer
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1 }}
          className="container py-12 border-t border-border"
        >
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex flex-wrap justify-center gap-x-8 gap-y-2 text-sm text-muted-foreground">
              <span>Mood Tracking</span>
              <span className="hidden md:inline text-border">·</span>
              <span>Weather Context</span>
              <span className="hidden md:inline text-border">·</span>
              <span>Spotify Integration</span>
              <span className="hidden md:inline text-border">·</span>
              <span>AI Reflections</span>
              <span className="hidden md:inline text-border">·</span>
              <Link to="/about" className="hover:text-foreground transition-colors">About</Link>
            </div>
            <Button 
              asChild 
              variant="outline" 
              className="rounded-full"
            >
              <Link to="/auth?tab=signup">
                Begin Writing Free
              </Link>
            </Button>
          </div>
        </motion.footer>

        {/* Quote */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.5 }}
          className="container py-16 text-center"
        >
          <p className="font-display text-2xl md:text-3xl italic text-muted-foreground/60 max-w-2xl mx-auto leading-relaxed">
            "The unexamined life is not worth living."
          </p>
          <p className="text-sm text-muted-foreground/40 mt-4 tracking-wide">— Socrates</p>
        </motion.div>
      </div>
    </div>
  );
};

export default LandingPage;
