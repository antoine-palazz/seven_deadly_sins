'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ENVIE } from '@/src/utils/constants';
import { randInt } from '@/src/utils/helpers';
import { audioManager } from '@/src/utils/audio';

interface EnvieGameProps {
  onWin: () => void;
  onLose: () => void;
}

interface RoundResult {
  playerTime: number | null; // null = missed / wrong
  ghostTime: number;
  won: boolean;
  penalty: boolean;
}

/**
 * Build a sequence of numbers that contains the target exactly once,
 * surrounded by near-miss decoys.
 */
function buildSequence(target: number): number[] {
  const decoys: number[] = [];
  for (let d = 1; d <= 3; d++) {
    if (target + d < 100) decoys.push(target + d);
    if (target - d > 9) decoys.push(target - d);
  }
  while (decoys.length < 10) {
    const r = randInt(10, 99);
    if (r !== target && !decoys.includes(r)) decoys.push(r);
  }

  const len = 10;
  const targetPos = randInt(3, len - 2);
  const seq: number[] = [];
  for (let i = 0; i < len; i++) {
    if (i === targetPos) {
      seq.push(target);
    } else {
      seq.push(decoys[i % decoys.length]);
    }
  }
  return seq;
}

export default function EnvieGame({ onWin, onLose }: EnvieGameProps) {
  // ── Refs for mutable game state (avoids stale closures) ──
  const roundRef = useRef(1);
  const playerScoreRef = useRef(0);
  const ghostScoreRef = useRef(0);
  const targetRef = useRef(0);
  const sequenceRef = useRef<number[]>([]);
  const seqIndexRef = useRef(0);
  const tappedRef = useRef(false);
  const gameOverRef = useRef(false);
  const targetAppearedAtRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── State for rendering only ──
  const [displayRound, setDisplayRound] = useState(1);
  const [phase, setPhase] = useState<'memorize' | 'sequence' | 'result' | 'done'>('memorize');
  const [displayTarget, setDisplayTarget] = useState(0);
  const [displayedNumber, setDisplayedNumber] = useState<number | null>(null);
  const [playerScore, setPlayerScore] = useState(0);
  const [ghostScore, setGhostScore] = useState(0);
  const [roundFeedback, setRoundFeedback] = useState('');
  const [results, setResults] = useState<RoundResult[]>([]);
  const [numberStyle, setNumberStyle] = useState<React.CSSProperties>({});

  const onWinRef = useRef(onWin);
  const onLoseRef = useRef(onLose);
  useEffect(() => { onWinRef.current = onWin; }, [onWin]);
  useEffect(() => { onLoseRef.current = onLose; }, [onLose]);

  // ── Cleanup helper ──
  const clearTimers = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
  }, []);

  // ── Finish the whole game ──
  const finishGame = useCallback(() => {
    if (gameOverRef.current) return;
    gameOverRef.current = true;
    clearTimers();
    setPhase('done');
    if (playerScoreRef.current > ghostScoreRef.current) {
      onWinRef.current();
    } else {
      onLoseRef.current();
    }
  }, [clearTimers]);

  // ── Advance to next round (or finish) ──
  const goNextRound = useCallback(() => {
    if (gameOverRef.current) return;
    if (roundRef.current >= ENVIE.ROUNDS) {
      finishGame();
      return;
    }
    roundRef.current += 1;
    setDisplayRound(roundRef.current);
    startRoundLogic();
  }, [finishGame]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Record a round result ──
  const recordResult = useCallback(
    (playerTime: number | null, ghostTime: number, won: boolean, penalty: boolean) => {
      if (won) {
        playerScoreRef.current += 1;
        setPlayerScore(playerScoreRef.current);
      } else {
        ghostScoreRef.current += 1;
        setGhostScore(ghostScoreRef.current);
      }
      setResults((prev) => [...prev, { playerTime, ghostTime, won, penalty }]);
    },
    []
  );

  // ── Handle a miss (sequence ended without tap) ──
  const handleMiss = useCallback(() => {
    if (gameOverRef.current || tappedRef.current) return;
    tappedRef.current = true;
    clearTimers();

    const ghostTime = randInt(ENVIE.GHOST_SPEED_MIN, ENVIE.GHOST_SPEED_MAX);
    recordResult(null, ghostTime, false, false);
    setRoundFeedback(`Raté ! Le fantôme gagne (${ghostTime}ms).`);
    if (audioManager) audioManager.playError();

    setPhase('result');
    timeoutRef.current = setTimeout(goNextRound, 1500);
  }, [clearTimers, recordResult, goNextRound]);

  // ── Handle a player tap ──
  const handleTap = useCallback(() => {
    if (phase !== 'sequence' || tappedRef.current || gameOverRef.current) return;
    tappedRef.current = true;
    clearTimers();

    const currentNumber = sequenceRef.current[seqIndexRef.current];
    const ghostTime = randInt(ENVIE.GHOST_SPEED_MIN, ENVIE.GHOST_SPEED_MAX);

    if (currentNumber !== targetRef.current) {
      // Wrong number tapped
      if (audioManager) audioManager.playError();
      recordResult(null, ghostTime, false, true);
      setRoundFeedback(`Mauvais nombre ! (${currentNumber} ≠ ${targetRef.current})`);
    } else {
      // Correct number — measure reaction from when the target first appeared
      const reactionTime = targetAppearedAtRef.current > 0
        ? Date.now() - targetAppearedAtRef.current
        : 999;
      const won = reactionTime < ghostTime;
      if (won) {
        if (audioManager) audioManager.playSuccess();
        setRoundFeedback(`Bravo ! ${reactionTime}ms vs ${ghostTime}ms`);
      } else {
        if (audioManager) audioManager.playError();
        setRoundFeedback(`Trop lent ! ${reactionTime}ms vs ${ghostTime}ms`);
      }
      recordResult(reactionTime, ghostTime, won, false);
    }

    setPhase('result');
    timeoutRef.current = setTimeout(goNextRound, 1500);
  }, [phase, clearTimers, recordResult, goNextRound]);

  // ── Core round logic (uses only refs, no stale closures) ──
  const startRoundLogic = useCallback(() => {
    const newTarget = randInt(10, 99);
    targetRef.current = newTarget;
    tappedRef.current = false;
    seqIndexRef.current = 0;
    targetAppearedAtRef.current = 0;

    setDisplayTarget(newTarget);
    setDisplayedNumber(null);
    setRoundFeedback('');
    setPhase('memorize');

    const sequence = buildSequence(newTarget);
    sequenceRef.current = sequence;

    // After memorize phase, start flashing numbers
    timeoutRef.current = setTimeout(() => {
      if (gameOverRef.current) return;
      setPhase('sequence');

      let idx = 0;
      intervalRef.current = setInterval(() => {
        if (gameOverRef.current || tappedRef.current) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          return;
        }

        if (idx >= sequence.length) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          // Player missed
          handleMiss();
          return;
        }

        const num = sequence[idx];
        seqIndexRef.current = idx;
        setDisplayedNumber(num);

        // Track when the target first appears
        if (num === newTarget && targetAppearedAtRef.current === 0) {
          targetAppearedAtRef.current = Date.now();
        }

        // Style distortion after round 5
        if (roundRef.current > 5) {
          setNumberStyle({
            transform: `rotate(${randInt(-15, 15)}deg) scale(${0.8 + Math.random() * 0.5})`,
          });
        } else {
          setNumberStyle({});
        }

        idx++;
      }, ENVIE.FLASH_DURATION);

    }, ENVIE.MEMORIZE_TIME);
  }, [handleMiss]);

  // ── Mount: start first round ──
  useEffect(() => {
    startRoundLogic();
    return clearTimers;
  }, [startRoundLogic, clearTimers]);

  // ── Render ──
  return (
    <div className="flex min-h-dvh flex-col items-center gap-4 px-4 pt-16 pb-8">
      {/* Header */}
      <div className="flex w-full max-w-lg items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">Envie</h2>
          <p className="text-xs text-foreground/40">
            Repère le bon nombre et tape plus vite que les fantômes.
          </p>
        </div>
        <div className="text-right">
          <p className="font-mono text-sm text-foreground/50">
            Manche {displayRound}/{ENVIE.ROUNDS}
          </p>
        </div>
      </div>

      {/* Scoreboard */}
      <div className="flex items-center gap-8">
        <div className="text-center">
          <p className="text-xs text-foreground/30">Toi</p>
          <p className="font-mono text-3xl font-bold text-gold">{playerScore}</p>
        </div>
        <p className="text-foreground/20">vs</p>
        <div className="text-center">
          <p className="text-xs text-foreground/30">Fantômes</p>
          <p className="font-mono text-3xl font-bold text-blood-light">{ghostScore}</p>
        </div>
      </div>

      {/* Game area */}
      <div
        className="flex min-h-[220px] w-full max-w-lg flex-col items-center justify-center rounded-xl border border-ash/20 bg-void/60 select-none"
        onClick={handleTap}
        onKeyDown={(e) => {
          if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); handleTap(); }
        }}
        tabIndex={0}
        role="button"
      >
        <AnimatePresence mode="wait">
          {phase === 'memorize' && (
            <motion.div
              key="memorize"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-3 p-4"
            >
              <p className="text-xs uppercase tracking-wider text-foreground/40">
                Mémorise ce nombre
              </p>
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="font-mono text-6xl font-bold text-gold"
              >
                {displayTarget}
              </motion.span>
              <p className="text-xs text-foreground/30">
                Tape quand tu le revois dans la séquence
              </p>
            </motion.div>
          )}

          {phase === 'sequence' && (
            <motion.div
              key="sequence"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-4 p-4"
            >
              {displayedNumber !== null && (
                <motion.span
                  key={seqIndexRef.current}
                  initial={{ opacity: 0.3, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.12 }}
                  className="font-mono text-7xl font-bold text-foreground"
                  style={numberStyle}
                >
                  {displayedNumber}
                </motion.span>
              )}
            </motion.div>
          )}

          {phase === 'result' && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="p-4 text-center"
            >
              <p className="text-sm text-foreground/60">{roundFeedback}</p>
            </motion.div>
          )}

          {phase === 'done' && (
            <motion.div
              key="done"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-4 text-center"
            >
              <p className="text-lg font-bold text-foreground">
                {playerScore > ghostScore ? 'Victoire !' : 'Défaite...'}
              </p>
              <p className="text-sm text-foreground/50">
                {playerScore} - {ghostScore}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {phase === 'sequence' && (
        <p className="animate-pulse text-xs text-gold-muted">
          Touche l&apos;écran quand tu vois le bon nombre
        </p>
      )}

      {/* Results history */}
      <div className="mt-2 w-full max-w-sm">
        <div className="max-h-32 overflow-y-auto rounded border border-ash/20 bg-void/50 p-2">
          {results.length === 0 && (
            <p className="text-center text-xs text-foreground/20">En attente...</p>
          )}
          {results
            .slice()
            .reverse()
            .map((r, i) => (
              <div
                key={i}
                className={`mb-1 flex items-center justify-between border-b border-ash/10 pb-1 text-xs ${
                  r.penalty
                    ? 'text-blood-light'
                    : r.won
                    ? 'text-green-400'
                    : 'text-foreground/40'
                }`}
              >
                <span>
                  {r.penalty
                    ? '✕ Mauvais nombre'
                    : r.won
                    ? `✓ ${r.playerTime}ms`
                    : r.playerTime == null
                    ? '✕ Raté'
                    : `✕ ${r.playerTime}ms`}
                </span>
                <span className="font-mono">Fantôme: {r.ghostTime}ms</span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
