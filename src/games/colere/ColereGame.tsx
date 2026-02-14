'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { COLERE } from '@/src/utils/constants';
import { randInt } from '@/src/utils/helpers';
import { audioManager } from '@/src/utils/audio';

interface ColereGameProps {
  onWin: () => void;
  onLose: () => void;
}

interface Target {
  id: number;
  x: number;
  y: number;
  dx: number;
  dy: number;
  isReal: boolean; // gold = real, red = decoy
  spawnTime: number;
  hitWindow: number;
}

let targetIdCounter = 0;

export default function ColereGame({ onWin, onLose }: ColereGameProps) {
  const [streak, setStreak] = useState(0);
  const [misses, setMisses] = useState(0);
  const [targets, setTargets] = useState<Target[]>([]);
  const [hitWindow, setHitWindow] = useState<number>(COLERE.BASE_HIT_WINDOW);
  const [feedback, setFeedback] = useState<{ text: string; type: 'hit' | 'miss' } | null>(null);
  const [shake, setShake] = useState(false);
  const gameOverRef = useRef(false);
  const streakRef = useRef(0);
  const missRef = useRef(0);
  const areaRef = useRef<HTMLDivElement>(null);

  // Keep refs in sync
  useEffect(() => {
    streakRef.current = streak;
  }, [streak]);
  useEffect(() => {
    missRef.current = misses;
  }, [misses]);

  const showFeedback = useCallback((text: string, type: 'hit' | 'miss') => {
    setFeedback({ text, type });
    setTimeout(() => setFeedback(null), 600);
  }, []);

  // Spawn targets at intervals
  useEffect(() => {
    if (gameOverRef.current) return;

    const spawnTarget = () => {
      if (gameOverRef.current) return;

      // Spawn 1 real target + 0-2 decoys
      const newTargets: Target[] = [];
      const numDecoys = randInt(0, Math.min(2, Math.floor(streakRef.current / 3)));

      // Real target
      newTargets.push({
        id: targetIdCounter++,
        x: randInt(10, 80),
        y: randInt(10, 80),
        dx: (Math.random() - 0.5) * 2,
        dy: (Math.random() - 0.5) * 2,
        isReal: true,
        spawnTime: Date.now(),
        hitWindow: hitWindow,
      });

      // Decoy targets
      for (let i = 0; i < numDecoys; i++) {
        newTargets.push({
          id: targetIdCounter++,
          x: randInt(10, 80),
          y: randInt(10, 80),
          dx: (Math.random() - 0.5) * 2.5,
          dy: (Math.random() - 0.5) * 2.5,
          isReal: false,
          spawnTime: Date.now(),
          hitWindow: hitWindow + 200, // decoys linger a bit longer
        });
      }

      setTargets((prev) => [...prev, ...newTargets]);
    };

    const interval = setInterval(spawnTarget, randInt(COLERE.TARGET_INTERVAL_MIN, COLERE.TARGET_INTERVAL_MAX));
    // Spawn first immediately
    spawnTarget();

    return () => clearInterval(interval);
  }, [hitWindow]);

  // Move targets and remove expired ones
  useEffect(() => {
    if (gameOverRef.current) return;

    const interval = setInterval(() => {
      const now = Date.now();
      setTargets((prev) => {
        const updated: Target[] = [];
        let missedReal = false;

        for (const t of prev) {
          const elapsed = now - t.spawnTime;
          if (elapsed > t.hitWindow) {
            // Expired
            if (t.isReal) {
              missedReal = true;
            }
            continue;
          }

          // Move target
          let nx = t.x + t.dx;
          let ny = t.y + t.dy;
          let ndx = t.dx;
          let ndy = t.dy;

          // Bounce off edges
          if (nx < 5 || nx > 85) ndx = -ndx;
          if (ny < 5 || ny > 85) ndy = -ndy;
          nx = Math.max(5, Math.min(85, nx));
          ny = Math.max(5, Math.min(85, ny));

          updated.push({ ...t, x: nx, y: ny, dx: ndx, dy: ndy });
        }

        if (missedReal && !gameOverRef.current) {
          // Missed a real target
          const newMisses = missRef.current + 1;
          setMisses(newMisses);
          setStreak(0);
          showFeedback('Cible manquée !', 'miss');
          if (audioManager) audioManager.playError();

          if (newMisses >= COLERE.MAX_MISSES) {
            gameOverRef.current = true;
            onLose();
          }
        }

        return updated;
      });
    }, 30);

    return () => clearInterval(interval);
  }, [showFeedback, onLose]);

  // Handle clicking a target
  const handleTargetClick = useCallback(
    (target: Target, e: React.MouseEvent) => {
      e.stopPropagation();
      if (gameOverRef.current) return;

      if (!target.isReal) {
        // Hit a decoy: MISS
        setStreak(0);
        const newMisses = misses + 1;
        setMisses(newMisses);
        showFeedback('Leurre ! Mauvaise cible !', 'miss');
        if (audioManager) audioManager.playError();
        setShake(true);
        setTimeout(() => setShake(false), 300);

        if (newMisses >= COLERE.MAX_MISSES) {
          gameOverRef.current = true;
          onLose();
        }

        // Remove the clicked decoy
        setTargets((prev) => prev.filter((t) => t.id !== target.id));
        return;
      }

      // Hit real target
      const newStreak = streak + 1;
      setStreak(newStreak);
      showFeedback(`Touché ! Série: ${newStreak}`, 'hit');
      if (audioManager) audioManager.playClick();

      // Remove target and any decoys from same wave
      setTargets((prev) => prev.filter((t) => t.id !== target.id));

      // Tighten hit window
      const newWindow = Math.max(COLERE.MIN_HIT_WINDOW, hitWindow - COLERE.WINDOW_TIGHTEN_STEP);
      setHitWindow(newWindow);

      // Check win
      if (newStreak >= COLERE.REQUIRED_STREAK) {
        gameOverRef.current = true;
        if (audioManager) audioManager.playSuccess();
        onWin();
      }
    },
    [streak, misses, hitWindow, showFeedback, onWin, onLose]
  );

  // Clicking empty area = miss
  const handleAreaClick = useCallback(() => {
    if (gameOverRef.current) return;
    // Only penalize if there are active real targets
    const hasRealTarget = targets.some((t) => t.isReal);
    if (hasRealTarget) {
      setStreak(0);
      const newMisses = misses + 1;
      setMisses(newMisses);
      showFeedback('Raté ! Clique sur la cible !', 'miss');
      if (audioManager) audioManager.playError();

      if (newMisses >= COLERE.MAX_MISSES) {
        gameOverRef.current = true;
        onLose();
      }
    }
  }, [targets, misses, showFeedback, onLose]);

  return (
    <motion.div
      className="flex min-h-dvh flex-col items-center gap-4 px-4 pt-16 pb-8"
      animate={shake ? { x: [0, -6, 6, -3, 3, 0] } : {}}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="flex w-full max-w-lg items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">Colère</h2>
          <p className="text-xs text-foreground/40">
            Série de {COLERE.REQUIRED_STREAK} requis. Frappe les cibles dorées. Ignore les rouges.
          </p>
        </div>
        <div className="text-right">
          <p className="font-mono text-2xl font-bold text-gold">{streak}/{COLERE.REQUIRED_STREAK}</p>
          <p className="text-xs text-blood-light">
            Erreurs: {misses}/{COLERE.MAX_MISSES}
          </p>
        </div>
      </div>

      {/* Hit window indicator */}
      <div className="flex items-center gap-2 text-xs text-foreground/30">
        <span>Fenêtre:</span>
        <span className="font-mono text-gold-muted">{hitWindow}ms</span>
        <div className="h-1 w-24 overflow-hidden rounded bg-ash">
          <div
            className="h-full rounded bg-gold-muted transition-all"
            style={{ width: `${(hitWindow / COLERE.BASE_HIT_WINDOW) * 100}%` }}
          />
        </div>
      </div>

      {/* Feedback */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className={`rounded px-4 py-2 text-sm font-bold ${
              feedback.type === 'hit'
                ? 'bg-green-900/30 text-green-400'
                : 'bg-blood/30 text-blood-light'
            }`}
          >
            {feedback.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Game area */}
      <div
        ref={areaRef}
        className="relative h-[55dvh] w-full max-w-lg overflow-hidden rounded-xl border border-ash/20 bg-void/50"
        onClick={handleAreaClick}
      >
        <AnimatePresence>
          {targets.map((target) => {
            const elapsed = Date.now() - target.spawnTime;
            const urgency = Math.max(0, 1 - elapsed / target.hitWindow);

            return (
              <motion.button
                key={target.id}
                initial={{ scale: 0 }}
                animate={{ scale: urgency > 0.2 ? 1 : [1, 0.8, 1] }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ duration: 0.15 }}
                onClick={(e) => handleTargetClick(target, e)}
                className={`absolute flex h-14 w-14 items-center justify-center rounded-full border-2 transition-all ${
                  target.isReal
                    ? 'border-gold bg-gold-muted/20 shadow-[0_0_15px_rgba(184,134,11,0.4)]'
                    : 'border-blood bg-blood/20 shadow-[0_0_15px_rgba(139,0,0,0.4)]'
                }`}
                style={{
                  left: `calc(${target.x}% - 28px)`,
                  top: `calc(${target.y}% - 28px)`,
                  opacity: urgency,
                }}
              >
                <span
                  className={`text-xl ${
                    target.isReal ? 'text-gold' : 'text-blood-light'
                  }`}
                >
                  {target.isReal ? '◉' : '✕'}
                </span>
                {/* Timer ring */}
                <svg
                  className="absolute inset-0 h-full w-full -rotate-90"
                  viewBox="0 0 56 56"
                >
                  <circle
                    cx="28"
                    cy="28"
                    r="25"
                    fill="none"
                    stroke={target.isReal ? '#B8860B' : '#8B0000'}
                    strokeWidth="2"
                    strokeDasharray={`${urgency * 157} 157`}
                    opacity="0.5"
                  />
                </svg>
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
