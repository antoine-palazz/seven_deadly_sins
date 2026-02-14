'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useGameStore } from '@/src/store/gameStore';
import { audioManager } from '@/src/utils/audio';
import { useHydrated } from '@/src/utils/useHydrated';
import GlitchText from '@/src/components/atmosphere/GlitchText';
import MuteButton from '@/src/components/layout/MuteButton';
import { TRIALS } from '@/src/data/trials';

const MONOLOGUE_LINES = [
  'Toi...',
  'Tu es venu pour lui, n\'est-ce pas ?',
  'Ton ami Antoine est entre mes mains.',
  'Il est prisonnier de ses propres péchés.',
  'Sept épreuves. Sept vérités à affronter.',
  'Résous-les toutes, et je le libérerai.',
  'Échoue... et il restera ici. Pour toujours.',
  'Les nombres sont la clé. Prouve que tu en es digne.',
];

export default function HomePage() {
  const router = useRouter();
  const introSeen = useGameStore((s) => s.introSeen);
  const setIntroSeen = useGameStore((s) => s.setIntroSeen);
  const currentTrial = useGameStore((s) => s.currentTrial);
  const completedTrials = useGameStore((s) => s.completedTrials);
  const judgmentPassed = useGameStore((s) => s.judgmentPassed);
  const resetAll = useGameStore((s) => s.resetAll);
  const audioEnabled = useGameStore((s) => s.audioEnabled);

  const [phase, setPhase] = useState<'intro' | 'monologue' | 'menu'>(
    introSeen ? 'menu' : 'intro'
  );
  const [lineIndex, setLineIndex] = useState(0);
  const [lineComplete, setLineComplete] = useState(false);
  const hydrated = useHydrated();

  const startExperience = useCallback(() => {
    if (audioManager && !audioManager.initialized) {
      audioManager.init();
      audioManager.setMuted(!audioEnabled);
      audioManager.startAmbient();
    }
    setPhase('monologue');
  }, [audioEnabled]);

  const advanceLine = useCallback(() => {
    if (!lineComplete) return;
    if (lineIndex < MONOLOGUE_LINES.length - 1) {
      setLineIndex((i) => i + 1);
      setLineComplete(false);
    } else {
      setIntroSeen();
      setPhase('menu');
    }
  }, [lineComplete, lineIndex, setIntroSeen]);

  const navigateToTrial = (sinId: string) => {
    router.push(`/trial/${sinId}`);
  };

  const allComplete = completedTrials.every(Boolean);

  if (!hydrated) {
    return <div className="min-h-dvh bg-background" />;
  }

  return (
    <div className="relative min-h-dvh bg-gradient-void">
      <MuteButton />

      <AnimatePresence mode="wait">
        {/* ─── INTRO SCREEN ─── */}
        {phase === 'intro' && (
          <motion.div
            key="intro"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex min-h-dvh flex-col items-center justify-center gap-8 px-6"
          >
            <motion.div
              initial={{ scale: 0, rotate: -90 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ duration: 2, ease: 'easeOut' }}
              className="relative flex h-32 w-32 items-center justify-center"
            >
              <svg viewBox="0 0 100 100" className="h-full w-full">
                <circle cx="50" cy="50" r="45" fill="none" stroke="#8B0000" strokeWidth="0.5" opacity="0.6" />
                {Array.from({ length: 7 }).map((_, i) => {
                  const angle = (i / 7) * Math.PI * 2 - Math.PI / 2;
                  const nextAngle = ((i + 3) / 7) * Math.PI * 2 - Math.PI / 2;
                  return (
                    <line
                      key={i}
                      x1={50 + 40 * Math.cos(angle)}
                      y1={50 + 40 * Math.sin(angle)}
                      x2={50 + 40 * Math.cos(nextAngle)}
                      y2={50 + 40 * Math.sin(nextAngle)}
                      stroke="#8B0000"
                      strokeWidth="0.5"
                      opacity="0.4"
                    />
                  );
                })}
                <text x="50" y="52" textAnchor="middle" dominantBaseline="middle" fill="#B8860B" fontSize="8" fontFamily="serif">
                  VII
                </text>
              </svg>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="animate-flicker text-center text-3xl font-bold tracking-wider text-foreground text-shadow-blood md:text-5xl"
            >
              Les Sept Péchés
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5 }}
              className="text-center text-sm tracking-[0.2em] text-gold-muted"
            >
              SAUVE ANTOINE
            </motion.p>

            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2.5 }}
              onClick={startExperience}
              whileTap={{ scale: 0.95 }}
              className="mt-8 animate-pulse-glow rounded-md border border-blood/50 bg-blood/10 px-8 py-4 font-serif text-lg text-foreground transition-all active:bg-blood/30"
            >
              Entrer
            </motion.button>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.3 }}
              transition={{ delay: 3 }}
              className="mt-2 text-xs text-foreground/30"
            >
              Son recommandé
            </motion.p>
          </motion.div>
        )}

        {/* ─── MONOLOGUE ─── */}
        {phase === 'monologue' && (
          <motion.div
            key="monologue"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex min-h-dvh flex-col items-center justify-center gap-8 px-6"
            onClick={advanceLine}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') advanceLine();
            }}
            tabIndex={0}
            role="button"
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={lineIndex}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="max-w-lg text-center"
              >
                <GlitchText
                  text={MONOLOGUE_LINES[lineIndex]}
                  as="p"
                  className="text-xl leading-relaxed text-foreground/90 md:text-2xl"
                  typewriter
                  typewriterSpeed={60}
                  glitchIntensity={lineIndex === 0 ? 'high' : 'low'}
                  onComplete={() => setLineComplete(true)}
                />
              </motion.div>
            </AnimatePresence>

            {lineComplete && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.5, 0] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="mt-8 text-xs text-foreground/30"
              >
                Toucher pour continuer
              </motion.p>
            )}
          </motion.div>
        )}

        {/* ─── TRIAL MENU ─── */}
        {phase === 'menu' && (
          <motion.div
            key="menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex min-h-dvh flex-col items-center justify-start gap-6 px-4 py-12 md:py-16"
          >
            <h1 className="animate-flicker text-center text-2xl font-bold text-foreground text-shadow-blood md:text-3xl">
              Les Épreuves
            </h1>
            <p className="max-w-sm text-center text-xs text-foreground/40">
              Chaque péché emprisonne Antoine un peu plus. Complète chaque épreuve
              dans l&apos;ordre pour le libérer.
            </p>

            <div className="mt-4 flex w-full max-w-md flex-col gap-3">
              {TRIALS.map((trial, i) => {
                const completed = completedTrials[i];
                const unlocked = i === 0 || completedTrials[i - 1];
                const isCurrent = i === currentTrial && !completed;

                return (
                  <motion.button
                    key={trial.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    onClick={() => unlocked && navigateToTrial(trial.id)}
                    disabled={!unlocked}
                    className={`flex items-center gap-4 rounded-lg border px-4 py-3 text-left transition-all ${
                      completed
                        ? 'border-green-900/40 bg-green-900/10'
                        : unlocked
                        ? 'border-blood/30 bg-blood/5 active:bg-blood/15'
                        : 'cursor-not-allowed border-ash/30 bg-ash/5 opacity-40'
                    } ${isCurrent ? 'animate-pulse-glow' : ''}`}
                  >
                    <span className="text-2xl">{trial.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className="text-sm font-bold"
                          style={{ color: unlocked ? trial.color : '#555' }}
                        >
                          {trial.name}
                        </span>
                        {completed && <span className="text-xs text-green-600">✓</span>}
                        {!unlocked && <span className="text-xs text-foreground/30">🔒</span>}
                      </div>
                      <span className="text-xs text-foreground/40">{trial.sin}</span>
                    </div>
                    {completed && (
                      <span className="font-mono text-xs text-gold-muted">Fragment obtenu</span>
                    )}
                  </motion.button>
                );
              })}
            </div>

            {allComplete && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5, type: 'spring' }}
                onClick={() => router.push('/judgment')}
                className="mt-6 animate-pulse-glow rounded-lg border border-gold/50 bg-gold-muted/10 px-8 py-4 font-serif text-lg text-gold transition-all active:bg-gold-muted/20"
              >
                {judgmentPassed ? 'Revoir le Jugement Final' : 'Jugement Final — Libérer Antoine'}
              </motion.button>
            )}

            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              onClick={() => {
                if (window.confirm('Effacer toute progression ? Cette action est irréversible.')) {
                  resetAll();
                  setPhase('intro');
                }
              }}
              className="mt-8 text-xs text-foreground/20 transition-colors hover:text-foreground/40"
            >
              Recommencer depuis le début
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
