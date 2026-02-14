'use client';

import { motion } from 'framer-motion';
import GlitchText from '@/src/components/atmosphere/GlitchText';
import type { Trial } from '@/src/data/trials';

interface TrialIntroProps {
  trial: Trial;
  onStart: () => void;
}

export default function TrialIntro({ trial, onStart }: TrialIntroProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex min-h-[100dvh] flex-col items-center justify-center gap-6 px-6 text-center bg-gradient-dark"
    >
      <motion.span
        initial={{ opacity: 0, scale: 2 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1 }}
        className="text-5xl"
      >
        {trial.icon}
      </motion.span>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-xs uppercase tracking-[0.3em] text-gold-muted"
      >
        {trial.subtitle}
      </motion.p>

      <GlitchText
        text={trial.name}
        as="h1"
        className="text-4xl font-bold text-foreground text-shadow-blood md:text-5xl"
        glitchIntensity="high"
      />

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="text-sm uppercase tracking-[0.2em]"
        style={{ color: trial.color }}
      >
        {trial.sin}
      </motion.p>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2 }}
        className="max-w-md text-sm leading-relaxed text-foreground/60"
      >
        {trial.description}
      </motion.p>

      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2 }}
        onClick={onStart}
        whileTap={{ scale: 0.95 }}
        className="mt-6 animate-pulse-glow rounded-md border border-blood/50 bg-blood/10 px-8 py-3 font-serif text-foreground transition-all active:bg-blood/30"
      >
        Commencer l&apos;épreuve
      </motion.button>
    </motion.div>
  );
}
