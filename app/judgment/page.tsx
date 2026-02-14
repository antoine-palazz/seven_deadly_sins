'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useGameStore } from '@/src/store/gameStore';
import { TRIALS } from '@/src/data/trials';
import { buildFinalCode, formatFragment } from '@/src/utils/fragments';
import { MAX_JUDGMENT_ATTEMPTS } from '@/src/utils/constants';
import { audioManager } from '@/src/utils/audio';
import { useHydrated } from '@/src/utils/useHydrated';
import GameShell from '@/src/components/layout/GameShell';
import GlitchText from '@/src/components/atmosphere/GlitchText';

export default function JudgmentPage() {
  const router = useRouter();
  const fragments = useGameStore((s) => s.fragments);
  const completedTrials = useGameStore((s) => s.completedTrials);
  const setJudgmentPassed = useGameStore((s) => s.setJudgmentPassed);

  const [codeInput, setCodeInput] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [phase, setPhase] = useState<'intro' | 'input' | 'success' | 'failure'>(
    'intro'
  );
  const [showHint, setShowHint] = useState(false);
  const hydrated = useHydrated();
  const [failMessage, setFailMessage] = useState('');

  useEffect(() => {
    if (hydrated && !completedTrials.every(Boolean)) {
      router.push('/');
    }
  }, [hydrated, completedTrials, router]);

  const expectedCode = buildFinalCode(fragments);

  const FAIL_MESSAGES = useMemo(() => [
    'Ce n\'est pas le bon code. Antoine reste prisonnier. Réfléchis...',
    'Les nombres te mentent-ils ? Rappelle-toi les indices de chaque épreuve.',
    'L\'Entité s\'impatiente. Concentre-toi sur l\'ordre des fragments.',
  ], []);

  const handleSubmit = useCallback(() => {
    if (!expectedCode) return;

    const cleanInput = codeInput.replace(/\s/g, '');
    if (cleanInput === expectedCode) {
      if (audioManager) {
        audioManager.stopHeartbeat();
        audioManager.playSuccess();
        audioManager.playTensionRise(3);
      }
      setJudgmentPassed();
      setPhase('success');
    } else {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      setFailMessage(FAIL_MESSAGES[Math.min(newAttempts - 1, FAIL_MESSAGES.length - 1)]);
      if (audioManager) audioManager.playError();

      if (newAttempts >= MAX_JUDGMENT_ATTEMPTS) {
        setShowHint(true);
      }

      setPhase('failure');
      setTimeout(() => setPhase('input'), 2500);
    }
  }, [codeInput, expectedCode, attempts, setJudgmentPassed, FAIL_MESSAGES]);

  if (!hydrated) {
    return <div className="min-h-dvh bg-background" />;
  }

  return (
    <GameShell>
      <div className="min-h-dvh bg-gradient-void">
        <AnimatePresence mode="wait">
          {/* ─── INTRO ─── */}
          {phase === 'intro' && (
            <motion.div
              key="intro"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex min-h-dvh flex-col items-center justify-center gap-8 px-6 text-center"
            >
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ duration: 2, type: 'spring' }}
                className="text-6xl"
              >
                ⚖
              </motion.div>

              <GlitchText
                text="Le Jugement Final"
                as="h1"
                className="text-3xl font-bold text-foreground text-shadow-blood md:text-4xl"
                glitchIntensity="high"
              />

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="max-w-md text-sm leading-relaxed text-foreground/50"
              >
                Sept épreuves. Sept fragments. Tu as affronté chaque péché pour
                sauver ton ami. Il est temps d&apos;assembler le code et de libérer Antoine.
              </motion.p>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.5 }}
                className="text-xs text-foreground/30"
              >
                Combine les fragments. Certains mentent sur leur forme.
                Rappelle-toi les indices.
              </motion.p>

              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 2 }}
                onClick={() => setPhase('input')}
                whileTap={{ scale: 0.95 }}
                className="mt-4 animate-pulse-glow rounded-md border border-gold/50 bg-gold-muted/10 px-8 py-3 font-serif text-gold transition-all active:bg-gold-muted/20"
              >
                Entrer le code
              </motion.button>
            </motion.div>
          )}

          {/* ─── INPUT ─── */}
          {(phase === 'input' || phase === 'failure') && (
            <motion.div
              key="input"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex min-h-dvh flex-col items-center justify-start gap-6 px-4 py-16"
            >
              <h2 className="text-xl font-bold text-foreground text-shadow-blood">
                Saisis le Code Final
              </h2>

              {/* Fragment display */}
              <div className="flex flex-wrap justify-center gap-3">
                {TRIALS.map((trial, i) => (
                  <motion.div
                    key={trial.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.15 }}
                    className="flex flex-col items-center gap-1 rounded-lg border border-ash/20 bg-void/50 p-3"
                  >
                    <span className="text-lg">{trial.icon}</span>
                    <span className="text-[10px] uppercase text-foreground/30">
                      {trial.name}
                    </span>
                    <span className="font-mono text-lg font-bold text-gold">
                      {formatFragment(fragments[i])}
                    </span>
                    {trial.reversed && (
                      <span className="text-[9px] text-blood-light">⟲ inversé</span>
                    )}
                  </motion.div>
                ))}
              </div>

              {/* Hint */}
              {showHint && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="max-w-sm rounded border border-gold-muted/30 bg-gold-muted/5 p-3 text-center text-xs text-gold-muted"
                >
                  <p className="font-bold">Indice de l&apos;Entité :</p>
                  <p className="mt-1">
                    Concatène les fragments dans l&apos;ordre des péchés. Le fragment
                    de l&apos;Envie doit être inversé (retourné). Les autres restent
                    tels quels.
                  </p>
                </motion.div>
              )}

              {/* Failure message */}
              {phase === 'failure' && (
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-sm italic text-blood-light"
                >
                  {failMessage}
                </motion.p>
              )}

              {/* Code input */}
              <div className="flex flex-col items-center gap-3">
                <input
                  type="text"
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value)}
                  placeholder="Entre le code final..."
                  maxLength={20}
                  className="w-64 rounded-lg border border-ash/30 bg-void px-4 py-3 text-center font-mono text-xl text-gold tracking-widest placeholder:text-foreground/15 focus:border-gold/50 focus:outline-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSubmit();
                  }}
                />
                <button
                  onClick={handleSubmit}
                  disabled={codeInput.replace(/\s/g, '').length < 10}
                  className="rounded-md border border-gold/40 bg-gold-muted/10 px-8 py-3 font-serif text-gold transition-all active:bg-gold-muted/20 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  Soumettre
                </button>
                <p className="text-xs text-foreground/20">
                  Tentative {attempts + 1}
                  {attempts >= MAX_JUDGMENT_ATTEMPTS ? ' — Indice disponible' : ''}
                </p>
              </div>

              <button
                onClick={() => router.push('/')}
                className="mt-4 text-xs text-foreground/20 underline"
              >
                Retour aux épreuves
              </button>
            </motion.div>
          )}

          {/* ─── SUCCESS ─── */}
          {phase === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex min-h-dvh flex-col items-center justify-center gap-8 px-6 text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.5, 1] }}
                transition={{ duration: 2, ease: 'easeOut' }}
                className="text-7xl"
              >
                ⚖
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.5 }}
              >
                <GlitchText
                  text="ANTOINE EST LIBRE"
                  as="h1"
                  className="text-4xl font-bold text-gold text-shadow-gold md:text-5xl"
                  glitchIntensity="low"
                />
              </motion.div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 2.5 }}
                className="max-w-md text-lg leading-relaxed text-foreground/70"
              >
                Tu as brisé les sept chaînes qui le retenaient.
              </motion.p>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 3.5 }}
                className="max-w-lg space-y-4 text-sm leading-relaxed text-foreground/50"
              >
                <p>
                  L&apos;Orgueil t&apos;a appris que les apparences trompent.
                  L&apos;Avarice, que la cupidité consume.
                </p>
                <p>
                  La Luxure t&apos;a perdu pour mieux te retrouver.
                  L&apos;Envie t&apos;a confronté aux reflets de ton ami.
                </p>
                <p>
                  La Gourmandise t&apos;a enseigné l&apos;équilibre.
                  La Colère, la maîtrise de soi.
                </p>
                <p>
                  Et la Paresse t&apos;a montré que le temps n&apos;attend personne.
                </p>
              </motion.div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 5 }}
                className="max-w-md text-base italic text-gold-muted"
              >
                &ldquo;Tu as prouvé ta loyauté. Antoine est libre grâce à toi.
                Mais souviens-toi : les sept péchés dorment toujours en chacun
                de nous.&rdquo;
              </motion.p>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 6 }}
                className="text-xs text-foreground/20"
              >
                — L&apos;Entité du Nombre
              </motion.p>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 7 }}
                className="flex flex-col items-center gap-3"
              >
                <p className="font-mono text-sm text-foreground/30">
                  Code final: {expectedCode}
                </p>
                <button
                  onClick={() => router.push('/')}
                  className="rounded-md border border-gold/30 bg-gold-muted/10 px-6 py-2 text-sm text-gold transition-all active:bg-gold-muted/20"
                >
                  Retour
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </GameShell>
  );
}
