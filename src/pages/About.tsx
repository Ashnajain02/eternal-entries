import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, BookOpen, Music, Cloud, Heart } from 'lucide-react';
import ashnaPhoto from '@/assets/ashna-jain.png';
import { Button } from '@/components/ui/button';

const About = () => {
  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Decorative background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full border border-border/40"
        />
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1.2, delay: 0.5, ease: "easeOut" }}
          className="absolute bottom-32 -left-16 w-[200px] h-[200px] rounded-full bg-accent/30"
        />
        <motion.div
          initial={{ opacity: 0, width: 0 }}
          animate={{ opacity: 1, width: '200px' }}
          transition={{ duration: 1, delay: 0.8, ease: "easeOut" }}
          className="absolute top-1/3 left-[10%] h-px bg-border"
        />
      </div>

      <div className="relative max-w-4xl mx-auto px-6 py-16">
        {/* Back button */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-12"
        >
          <Link to="/">
            <Button variant="ghost" className="text-muted-foreground hover:text-foreground gap-2 pl-0">
              <ArrowLeft className="w-4 h-4" />
              Back to home
            </Button>
          </Link>
        </motion.div>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="mb-16"
        >
          <p className="text-sm font-body tracking-[0.2em] uppercase text-muted-foreground mb-3">The story behind</p>
          <h1 className="font-display text-5xl md:text-6xl font-light text-foreground leading-tight">
            Eternal Entries
          </h1>
        </motion.div>

        {/* Main content */}
        <div className="grid md:grid-cols-2 gap-16 items-start">
          {/* Photo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative"
          >
            <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-muted border border-border/60 shadow-lg">
              <img
                src={ashnaPhoto}
                alt="Ashna Jain"
                className="absolute inset-0 w-full h-full object-cover object-top"
              />
            </div>
            {/* Decorative offset border */}
            <div className="absolute -bottom-4 -right-4 w-full h-full rounded-2xl border border-border/40 -z-10" />
          </motion.div>

          {/* Text */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.35 }}
            className="flex flex-col gap-6"
          >
            <div>
              <h2 className="font-display text-3xl font-light text-foreground mb-1">Ashna Jain</h2>
              <p className="font-body text-sm tracking-widest uppercase text-muted-foreground">Creator & Developer</p>
            </div>

            <div className="w-12 h-px bg-border" />

            <div className="space-y-5 font-body text-foreground/80 leading-relaxed text-[0.95rem]">
              <p>
                It started with a five-year paper journal during Covid — a small, beautiful book I received as a gift.
                I loved flipping back to see what I had done on that exact day a year before. But there was never
                quite enough space to write everything I wanted to say.
              </p>
              <p>
                When I moved to online journaling, something felt missing. Digital tools captured words — but journaling
                had always been so much more than that. It was the song playing in the background, the weather outside
                the window, the particular shade of feeling that colour-coded emojis could never quite name.
              </p>
              <p>
                So I built something for myself. A place where music, mood, and weather live alongside the words —
                where a journal entry feels as textured and alive as the moment it was written.
              </p>
              <p>
                What started as a personal project, just for me, I now want to share with the world. Journaling has
                been transformative in my life — it has held me through the darkest periods and helped me find light
                on the other side. I hope Eternal Entries can do the same for you.
              </p>
            </div>

            <div className="w-12 h-px bg-border" />

            {/* Feature pills */}
            <div className="flex flex-wrap gap-2">
              {[
                { icon: BookOpen, label: 'Paper journal origins' },
                { icon: Music, label: 'Music-first design' },
                { icon: Cloud, label: 'Weather & mood' },
                { icon: Heart, label: 'Built with love' },
              ].map(({ icon: Icon, label }) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent text-accent-foreground font-body text-xs border border-border/50"
                >
                  <Icon className="w-3 h-3" />
                  {label}
                </span>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Quote */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="mt-24 text-center"
        >
          <div className="max-w-2xl mx-auto border-t border-border pt-16">
            <p className="font-display text-2xl md:text-3xl italic font-light text-foreground/70 leading-relaxed">
              "Journaling is transformative. It has helped me through the darkest periods of my life."
            </p>
            <p className="font-body text-sm text-muted-foreground mt-4">— Ashna Jain</p>
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="mt-16 flex justify-center"
        >
          <Link to="/auth">
            <Button className="bg-primary text-primary-foreground hover:opacity-90 font-body tracking-wide px-8 py-5 text-sm">
              Start your journal
            </Button>
          </Link>
        </motion.div>
      </div>
    </div>
  );
};

export default About;
