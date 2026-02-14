'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/src/store/gameStore';
import { TRIALS, SIN_ORDER, type SinId } from '@/src/data/trials';
import { useHydrated } from '@/src/utils/useHydrated';
import GameShell from '@/src/components/layout/GameShell';
import TrialIntro from '@/src/components/ui/TrialIntro';
import FragmentReveal from '@/src/components/ui/FragmentReveal';
import { audioManager } from '@/src/utils/audio';

// Game components
import OrgueilGame from '@/src/games/orgueil/OrgueilGame';
import AvariceGame from '@/src/games/avarice/AvariceGame';
import LuxureGame from '@/src/games/luxure/LuxureGame';
import EnvieGame from '@/src/games/envie/EnvieGame';
import GourmandiseGame from '@/src/games/gourmandise/GourmandiseGame';
import ColereGame from '@/src/games/colere/ColereGame';
import ParesseGame from '@/src/games/paresse/ParesseGame';

const GAME_MAP: Record<SinId, React.ComponentType<{ onWin: () => void; onLose: () => void }>> = {
  orgueil: OrgueilGame,
  avarice: AvariceGame,
  luxure: LuxureGame,
  envie: EnvieGame,
  gourmandise: GourmandiseGame,
  colere: ColereGame,
  paresse: ParesseGame,
};

export default function TrialPageClient() {
  const params = useParams();
  const router = useRouter();
  const sinId = params.sin as SinId;

  const completedTrials = useGameStore((s) => s.completedTrials);
  const completeTrial = useGameStore((s) => s.completeTrial);

  const [phase, setPhase] = useState<'intro' | 'playing' | 'lost' | 'won'>('intro');
  const hydrated = useHydrated();

  const trialIndex = SIN_ORDER.indexOf(sinId);
  const trial = TRIALS[trialIndex];

  // Redirect if trial doesn't exist or isn't unlocked
  useEffect(() => {
    if (!hydrated) return;
    if (trialIndex === -1) {
      router.push('/');
      return;
    }
    // Check if previous trial is completed (except first)
    if (trialIndex > 0 && !completedTrials[trialIndex - 1]) {
      router.push('/');
    }
  }, [hydrated, trialIndex, completedTrials, router]);

  const handleWin = useCallback(() => {
    completeTrial(trialIndex, trial.fragment);
    if (audioManager) audioManager.playSuccess();
    setPhase('won');
  }, [trialIndex, trial, completeTrial]);

  const handleLose = useCallback(() => {
    if (audioManager) audioManager.playError();
    setPhase('lost');
  }, []);

  const handleContinue = useCallback(() => {
    const nextIndex = trialIndex + 1;
    if (nextIndex < SIN_ORDER.length) {
      router.push(`/trial/${SIN_ORDER[nextIndex]}`);
    } else {
      router.push('/');
    }
  }, [trialIndex, router]);

  if (!hydrated || trialIndex === -1) {
    return <div className="min-h-dvh bg-background" />;
  }

  const GameComponent = GAME_MAP[sinId];

  return (
    <GameShell>
      <div className="min-h-dvh bg-gradient-dark">
        <AnimatePresence mode="wait">
          {phase === 'intro' && (
            <TrialIntro
              key="intro"
              trial={trial}
              onStart={() => {
                if (audioManager) audioManager.startHeartbeat(70);
                setPhase('playing');
              }}
            />
          )}

          {phase === 'playing' && (
            <div key="playing" className="min-h-dvh">
              <GameComponent onWin={handleWin} onLose={handleLose} />
            </div>
          )}

          {phase === 'lost' && (
            <div
              key="lost"
              className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center"
            >
              <p className="animate-text-glitch text-2xl font-bold text-blood-light">
                Échec
              </p>
              <p className="max-w-xs text-sm text-foreground/50">
                Tu as échoué. Antoine souffre encore dans sa prison.
                Mais l&apos;Entité t&apos;accorde une autre chance...
              </p>
              <button
                onClick={() => setPhase('intro')}
                className="mt-4 rounded-md border border-blood/40 bg-blood/10 px-6 py-3 font-serif text-foreground transition-all active:bg-blood/30"
              >
                Réessayer
              </button>
            </div>
          )}

          {phase === 'won' && (
            <FragmentReveal
              key="won"
              fragment={trial.fragment}
              hint={trial.fragmentHint}
              sinName={trial.name}
              onContinue={handleContinue}
            />
          )}
        </AnimatePresence>
      </div>
    </GameShell>
  );
}
