'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Timer from '@/src/components/ui/Timer';
import { GOURMANDISE } from '@/src/utils/constants';
import { randInt } from '@/src/utils/helpers';
import { audioManager } from '@/src/utils/audio';

interface GourmandiseGameProps {
  onWin: () => void;
  onLose: () => void;
}

interface FallingNumber {
  id: number;
  value: number;
  x: number; // percentage 5-85
  poison: boolean;
  /** Total fall duration in seconds (CSS-driven) */
  fallDuration: number;
  /** Timestamp when spawned */
  spawnedAt: number;
}

let fallingIdCounter = 0;

export default function GourmandiseGame({ onWin, onLose }: GourmandiseGameProps) {
  const [total, setTotal] = useState<number>(GOURMANDISE.START_TOTAL);
  const [running, setRunning] = useState(true);
  const [numbers, setNumbers] = useState<FallingNumber[]>([]);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const gameOverRef = useRef(false);
  const totalRef = useRef<number>(GOURMANDISE.START_TOTAL);
  const comboRef = useRef(0);
  const bestComboRef = useRef(0);

  // Keep refs in sync
  useEffect(() => { totalRef.current = total; }, [total]);
  useEffect(() => { comboRef.current = combo; }, [combo]);
  useEffect(() => { bestComboRef.current = bestCombo; }, [bestCombo]);

  // Constant drain
  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => {
      setTotal((t) => {
        const newT = t - GOURMANDISE.DECAY_PER_SECOND;
        if (newT <= 0) {
          if (!gameOverRef.current) {
            gameOverRef.current = true;
            setRunning(false);
            onLose();
          }
          return 0;
        }
        return newT;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [running, onLose]);

  // Spawn numbers — CSS handles the falling animation
  useEffect(() => {
    if (!running) return;

    const startTime = Date.now();
    const baseDuration = GOURMANDISE.SPAWN_INTERVAL;
    const minDuration = GOURMANDISE.MIN_SPAWN_INTERVAL;
    const gameDuration = GOURMANDISE.DURATION * 1000;

    const spawn = () => {
      if (gameOverRef.current) return;

      const isPoison = Math.random() < GOURMANDISE.POISON_CHANCE;
      const value = isPoison
        ? randInt(5, 20)
        : randInt(GOURMANDISE.NUMBER_MIN, GOURMANDISE.NUMBER_MAX);

      // Fall duration gets slightly faster over time (6s → 3.5s)
      const progress = Math.min((Date.now() - startTime) / gameDuration, 1);
      const fallDuration = 6 - progress * 2.5;

      const num: FallingNumber = {
        id: fallingIdCounter++,
        value,
        x: randInt(8, 82),
        poison: isPoison,
        fallDuration,
        spawnedAt: Date.now(),
      };
      setNumbers((prev) => [...prev, num]);
    };

    // Dynamic spawn interval that accelerates
    let timeout: ReturnType<typeof setTimeout>;
    const scheduleNext = () => {
      const progress = Math.min((Date.now() - startTime) / gameDuration, 1);
      const interval = baseDuration - (baseDuration - minDuration) * progress;
      timeout = setTimeout(() => {
        spawn();
        if (!gameOverRef.current) scheduleNext();
      }, interval);
    };

    spawn(); // first one immediately
    scheduleNext();

    return () => clearTimeout(timeout);
  }, [running]);

  // Garbage-collect numbers that have finished falling (off screen)
  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => {
      const now = Date.now();
      setNumbers((prev) =>
        prev.filter((n) => {
          const elapsed = (now - n.spawnedAt) / 1000;
          return elapsed < n.fallDuration + 0.5; // +0.5s grace
        })
      );
    }, 500);
    return () => clearInterval(interval);
  }, [running]);

  const showFeedback = useCallback((msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 800);
  }, []);

  const catchNumber = useCallback(
    (num: FallingNumber, e: React.MouseEvent | React.TouchEvent) => {
      e.stopPropagation();
      if (!running || gameOverRef.current) return;

      // Remove immediately
      setNumbers((prev) => prev.filter((n) => n.id !== num.id));

      if (num.poison) {
        const newTotal = totalRef.current - num.value;
        setTotal(newTotal);
        setCombo(0);
        showFeedback(`☠ POISON ! −${num.value}`);
        if (audioManager) audioManager.playError();

        if (newTotal <= 0 || newTotal > GOURMANDISE.SAFE_MAX) {
          gameOverRef.current = true;
          setRunning(false);
          onLose();
        }
        return;
      }

      // Good number
      const currentCombo = comboRef.current;
      const comboBonus = currentCombo >= 3 ? Math.floor(num.value * 0.3) : 0;
      const gained = num.value + comboBonus;
      const newTotal = totalRef.current + gained;
      const newCombo = currentCombo + 1;
      setCombo(newCombo);
      if (newCombo > bestComboRef.current) setBestCombo(newCombo);

      setTotal(newTotal);
      showFeedback(`+${gained}${comboBonus > 0 ? ` (combo ×${newCombo})` : ''}`);
      if (audioManager) audioManager.playClick();

      if (newTotal > GOURMANDISE.SAFE_MAX) {
        gameOverRef.current = true;
        setRunning(false);
        showFeedback('EXCÈS ! Trop de gloutonnerie !');
        if (audioManager) audioManager.playError();
        onLose();
      } else if (newTotal < GOURMANDISE.SAFE_MIN) {
        gameOverRef.current = true;
        setRunning(false);
        showFeedback('FAMINE ! Total trop bas !');
        if (audioManager) audioManager.playError();
        onLose();
      }
    },
    [running, showFeedback, onLose]
  );

  const handleTimeUp = useCallback(() => {
    if (gameOverRef.current) return;
    gameOverRef.current = true;
    setRunning(false);

    if (totalRef.current >= GOURMANDISE.SAFE_MIN && totalRef.current <= GOURMANDISE.SAFE_MAX) {
      if (audioManager) audioManager.playSuccess();
      onWin();
    } else {
      if (audioManager) audioManager.playError();
      onLose();
    }
  }, [onWin, onLose]);

  const pct = ((total - GOURMANDISE.SAFE_MIN) / (GOURMANDISE.SAFE_MAX - GOURMANDISE.SAFE_MIN)) * 100;
  const inDanger = total < GOURMANDISE.SAFE_MIN + 15 || total > GOURMANDISE.SAFE_MAX - 15;

  return (
    <div className="flex min-h-dvh flex-col items-center gap-3 px-4 pt-16 pb-4">
      {/* Header */}
      <div className="flex w-full max-w-lg items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">Gourmandise</h2>
          <p className="text-xs text-foreground/40">
            Maintiens l&apos;équilibre. Attrape les bons, évite les poisons.
          </p>
        </div>
        <Timer
          duration={GOURMANDISE.DURATION}
          running={running}
          onTimeUp={handleTimeUp}
        />
      </div>

      {/* Total gauge */}
      <div className="w-full max-w-lg">
        <div className="flex items-center justify-between text-xs text-foreground/30">
          <span>{GOURMANDISE.SAFE_MIN}</span>
          <motion.span
            className={`font-mono text-xl font-bold ${
              inDanger ? 'text-blood-light animate-heartbeat' : 'text-gold'
            }`}
            animate={inDanger ? { scale: [1, 1.05, 1] } : {}}
            transition={{ repeat: Infinity, duration: 0.6 }}
          >
            {Math.round(total)}
          </motion.span>
          <span>{GOURMANDISE.SAFE_MAX}</span>
        </div>
        <div className="relative h-4 w-full overflow-hidden rounded-full border border-ash/30 bg-void">
          <div className="absolute h-full w-full bg-green-900/20" />
          <motion.div
            className="absolute h-full w-1 bg-gold"
            animate={{ left: `${Math.max(0, Math.min(100, pct))}%` }}
            transition={{ duration: 0.1 }}
          />
        </div>
        <div className="mt-1 flex items-center justify-between text-[10px]">
          <span className="text-blood-light">Famine</span>
          <span className="text-foreground/20">Combo: {combo} | Meilleur: {bestCombo}</span>
          <span className="text-blood-light">Excès</span>
        </div>
        <p className="mt-1 text-center text-[10px] text-foreground/20">
          ⚠ Le total diminue de {GOURMANDISE.DECAY_PER_SECOND}/s — attrape des nombres pour survivre !
        </p>
      </div>

      {/* Feedback */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded bg-void/80 px-3 py-1 text-sm font-bold text-gold-muted"
          >
            {feedback}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Game area */}
      <div className="relative h-[50dvh] w-full max-w-lg overflow-hidden rounded-xl border border-ash/20 bg-void/40">
        {numbers.map((num) => (
          <button
            key={num.id}
            className={`absolute z-10 flex items-center justify-center rounded-full font-mono font-bold
              select-none touch-manipulation
              ${num.poison
                ? 'h-14 w-14 border-2 border-blood bg-blood/30 text-base text-blood-light shadow-[0_0_12px_rgba(139,0,0,0.4)]'
                : 'h-14 w-14 border-2 border-gold-muted/50 bg-gold-muted/15 text-base text-gold shadow-[0_0_10px_rgba(184,134,11,0.25)]'
              }
              active:scale-90 active:brightness-150 transition-transform duration-75`}
            style={{
              left: `${num.x}%`,
              top: '0%',
              transform: 'translate(-50%, -50%)',
              animation: `gourmandise-fall ${num.fallDuration}s linear forwards`,
              animationDelay: '0s',
            }}
            onClick={(e) => catchNumber(num, e)}
            onTouchEnd={(e) => {
              e.preventDefault();
              catchNumber(num, e);
            }}
          >
            {num.poison && <span className="absolute -top-1.5 -right-1.5 text-xs">☠</span>}
            {num.value}
          </button>
        ))}

        {/* Bottom boundary line */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-blood/30" />
      </div>
    </div>
  );
}
