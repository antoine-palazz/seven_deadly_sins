'use client';

import { motion } from 'framer-motion';
import { formatFragment } from '@/src/utils/fragments';

interface FragmentRevealProps {
  fragment: number;
  hint: string;
  sinName: string;
  onContinue: () => void;
}

export default function FragmentReveal({
  fragment,
  hint,
  sinName,
  onContinue,
}: FragmentRevealProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex min-h-[60dvh] flex-col items-center justify-center gap-8 px-4 text-center"
    >
      <motion.p
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="text-sm uppercase tracking-[0.3em] text-gold-muted"
      >
        {sinName} — Épreuve Accomplie
      </motion.p>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="max-w-xs text-xs text-foreground/40"
      >
        Une chaîne de moins pour Antoine. Tu te rapproches de sa libération.
      </motion.p>

      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ delay: 1, type: 'spring', stiffness: 100 }}
        className="flex h-28 w-28 items-center justify-center rounded-full border-2 border-blood/60 bg-void"
      >
        <span className="font-mono text-4xl font-bold text-blood-light text-shadow-blood">
          {formatFragment(fragment)}
        </span>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="max-w-xs text-sm italic text-foreground/50"
      >
        {hint}
      </motion.p>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2 }}
        className="text-xs text-foreground/30"
      >
        Retiens ce fragment. Il servira à libérer Antoine lors du Jugement Final.
      </motion.p>

      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.5 }}
        onClick={onContinue}
        whileTap={{ scale: 0.95 }}
        className="mt-4 rounded-md border border-blood/40 bg-blood/10 px-6 py-3 font-serif text-foreground transition-all active:bg-blood/30"
      >
        Continuer
      </motion.button>
    </motion.div>
  );
}
