'use client';

import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AVARICE } from '@/src/utils/constants';
import { randFloat, randInt } from '@/src/utils/helpers';
import { audioManager } from '@/src/utils/audio';

interface AvariceGameProps {
  onWin: () => void;
  onLose: () => void;
}

interface Offer {
  points: number;
  riskIncrease: number;
  label: string;
  icon: string;
}

interface RoundLog {
  action: 'accumulate' | 'stabilize' | 'bet';
  detail: string;
  score: number;
}

function generateOffers(): Offer[] {
  return [
    {
      points: randInt(AVARICE.POINTS_MIN, AVARICE.POINTS_MID),
      riskIncrease: randFloat(0.04, 0.08),
      label: 'Prudent',
      icon: '🟢',
    },
    {
      points: randInt(AVARICE.POINTS_MID, AVARICE.POINTS_MAX),
      riskIncrease: randFloat(0.08, 0.15),
      label: 'Risqué',
      icon: '🟡',
    },
    {
      points: randInt(AVARICE.POINTS_MAX, AVARICE.POINTS_MAX + 10),
      riskIncrease: randFloat(0.15, 0.25),
      label: 'Dangereux',
      icon: '🔴',
    },
  ];
}

export default function AvariceGame({ onWin, onLose }: AvariceGameProps) {
  const [score, setScore] = useState(0);
  const [collapseProbability, setCollapseProbability] = useState<number>(
    AVARICE.BASE_COLLAPSE_PROB
  );
  const [turn, setTurn] = useState(1);
  const [log, setLog] = useState<RoundLog[]>([]);
  const [collapsed, setCollapsed] = useState(false);
  const [won, setWon] = useState(false);
  const [shake, setShake] = useState(false);
  const [offers, setOffers] = useState<Offer[]>(() => generateOffers());
  const [lastGain, setLastGain] = useState(0);
  const [feedback, setFeedback] = useState<{ msg: string; type: 'good' | 'bad' | 'neutral' } | null>(null);
  const doneRef = useRef(false);

  const showFeedback = useCallback((msg: string, type: 'good' | 'bad' | 'neutral' = 'neutral') => {
    setFeedback({ msg, type });
    setTimeout(() => setFeedback(null), 1200);
  }, []);

  const endGame = useCallback(
    (win: boolean) => {
      if (doneRef.current) return;
      doneRef.current = true;
      if (win) {
        setWon(true);
        if (audioManager) audioManager.playSuccess();
        setTimeout(() => onWin(), 800);
      } else {
        setCollapsed(true);
        if (audioManager) audioManager.playError();
        setShake(true);
        setTimeout(() => setShake(false), 500);
        setTimeout(() => onLose(), 1500);
      }
    },
    [onWin, onLose]
  );

  const advanceTurn = useCallback(
    (newScore: number) => {
      if (newScore >= AVARICE.TARGET_SCORE) {
        setScore(newScore);
        endGame(true);
        return;
      }
      if (turn >= AVARICE.MAX_TURNS) {
        setScore(newScore);
        endGame(false);
        return;
      }
      setScore(newScore);
      setTurn((t) => t + 1);
      setOffers(generateOffers());
    },
    [turn, endGame]
  );

  const handleAccumulate = useCallback(
    (offer: Offer) => {
      if (collapsed || won) return;

      const rollCollapse = Math.random() < collapseProbability;

      if (rollCollapse) {
        const halfScore = Math.floor(score / 2);
        setScore(halfScore);
        setCollapseProbability(AVARICE.BASE_COLLAPSE_PROB);
        showFeedback(`💥 Effondrement ! Score ÷ 2 → ${halfScore}`, 'bad');
        if (audioManager) audioManager.playError();
        setShake(true);
        setTimeout(() => setShake(false), 500);

        setLog((prev) => [
          ...prev,
          { action: 'accumulate', detail: `COLLAPSE → ${halfScore}`, score: halfScore },
        ]);

        if (halfScore === 0 && turn >= AVARICE.MAX_TURNS - 2) {
          endGame(false);
          return;
        }

        setTurn((t) => t + 1);
        setOffers(generateOffers());
        return;
      }

      const newProb = Math.min(collapseProbability + offer.riskIncrease, 0.95);
      setCollapseProbability(newProb);
      setLastGain(offer.points);
      showFeedback(`+${offer.points} pts`, 'good');

      if (audioManager) audioManager.playClick();

      setLog((prev) => [
        ...prev,
        { action: 'accumulate', detail: `+${offer.points} (${offer.label})`, score: score + offer.points },
      ]);

      advanceTurn(score + offer.points);
    },
    [score, collapseProbability, collapsed, won, turn, advanceTurn, endGame, showFeedback]
  );

  const handleStabilize = useCallback(() => {
    if (collapsed || won) return;

    const cost = AVARICE.STABILIZE_COST;
    const newScore = Math.max(0, score - cost);
    const newProb = Math.max(
      collapseProbability * AVARICE.STABILIZE_REDUCTION,
      AVARICE.BASE_COLLAPSE_PROB
    );
    setCollapseProbability(newProb);
    showFeedback(`🛡 −${cost} pts, risque → ${Math.round(newProb * 100)}%`, 'neutral');

    if (audioManager) audioManager.playClick();

    setLog((prev) => [
      ...prev,
      { action: 'stabilize', detail: `−${cost}, risque → ${Math.round(newProb * 100)}%`, score: newScore },
    ]);

    advanceTurn(newScore);
  }, [score, collapseProbability, collapsed, won, advanceTurn, showFeedback]);

  const handleBet = useCallback(() => {
    if (collapsed || won || lastGain === 0) return;

    const betWin = Math.random() < 0.5;
    if (betWin) {
      const bonus = lastGain;
      showFeedback(`🎲 Pari gagné ! +${bonus}`, 'good');
      if (audioManager) audioManager.playSuccess();
      setLog((prev) => [
        ...prev,
        { action: 'bet', detail: `Gagné +${bonus}`, score: score + bonus },
      ]);
      advanceTurn(score + bonus);
    } else {
      const loss = lastGain;
      const newScore = Math.max(0, score - loss);
      showFeedback(`🎲 Pari perdu ! −${loss}`, 'bad');
      if (audioManager) audioManager.playError();
      setLog((prev) => [
        ...prev,
        { action: 'bet', detail: `Perdu −${loss}`, score: newScore },
      ]);
      advanceTurn(newScore);
    }
    setLastGain(0);
  }, [collapsed, won, lastGain, score, advanceTurn, showFeedback]);

  const dangerLevel = collapseProbability / 0.95;
  const turnProgress = ((turn - 1) / AVARICE.MAX_TURNS) * 100;
  const scoreProgress = Math.min((score / AVARICE.TARGET_SCORE) * 100, 100);
  const gameActive = !collapsed && !won;

  return (
    <motion.div
      animate={shake ? { x: [0, -12, 12, -6, 6, 0] } : {}}
      transition={{ duration: 0.4 }}
      className="flex min-h-dvh flex-col items-center gap-4 px-4 pt-16 pb-8"
    >
      {/* Header row */}
      <div className="flex w-full max-w-md items-start justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">Avarice</h2>
          <p className="text-xs text-foreground/40">
            Atteins {AVARICE.TARGET_SCORE} pts avant la fin
          </p>
        </div>
        <div className="flex flex-col items-end gap-0.5">
          <span className="rounded bg-ash/20 px-2 py-0.5 font-mono text-xs text-foreground/50">
            Tour {turn}/{AVARICE.MAX_TURNS}
          </span>
          <div className="h-1 w-20 overflow-hidden rounded-full bg-ash/30">
            <div
              className="h-full rounded-full bg-foreground/20 transition-all"
              style={{ width: `${turnProgress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Score block */}
      <div className="flex w-full max-w-md flex-col items-center gap-2 rounded-xl border border-ash/20 bg-void/40 py-4">
        <motion.span
          animate={{ scale: won ? [1, 1.2, 1] : 1 }}
          className="font-mono text-5xl font-bold text-gold"
        >
          {score}
        </motion.span>
        <div className="flex w-48 items-center gap-2">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-ash/30">
            <motion.div
              className="h-full rounded-full bg-gold-muted"
              animate={{ width: `${scoreProgress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <span className="text-[10px] text-foreground/30">{AVARICE.TARGET_SCORE}</span>
        </div>
      </div>

      {/* Danger meter */}
      <div className="w-full max-w-md">
        <div className="flex items-center justify-between text-[10px] text-foreground/30">
          <span>Risque d&apos;effondrement</span>
          <span className="font-mono">{Math.round(collapseProbability * 100)}%</span>
        </div>
        <div className="mt-1 h-3 w-full overflow-hidden rounded-full border border-blood/20 bg-void">
          <motion.div
            className="h-full rounded-full"
            animate={{
              width: `${dangerLevel * 100}%`,
              backgroundColor:
                dangerLevel < 0.3 ? '#2E8B57'
                : dangerLevel < 0.6 ? '#B8860B'
                : dangerLevel < 0.8 ? '#FF4500'
                : '#8B0000',
            }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Feedback */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`rounded-lg px-4 py-2 text-sm font-bold ${
              feedback.type === 'good'
                ? 'bg-green-900/30 text-green-300'
                : feedback.type === 'bad'
                ? 'bg-blood/30 text-blood-light'
                : 'bg-ash/20 text-foreground/60'
            }`}
          >
            {feedback.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Offer cards + actions */}
      {gameActive && (
        <div className="w-full max-w-md space-y-3">
          <p className="text-center text-[10px] uppercase tracking-widest text-foreground/25">
            Choisis une offre
          </p>

          <div className="grid grid-cols-3 gap-2">
            {offers.map((offer, i) => (
              <motion.button
                key={`${turn}-${i}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                whileTap={{ scale: 0.93 }}
                onClick={() => handleAccumulate(offer)}
                className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 transition-colors ${
                  i === 0
                    ? 'border-green-800/30 bg-green-950/20 active:bg-green-900/30'
                    : i === 1
                    ? 'border-gold-muted/30 bg-gold-muted/5 active:bg-gold-muted/15'
                    : 'border-blood/30 bg-blood/5 active:bg-blood/15'
                }`}
              >
                <span className="text-base">{offer.icon}</span>
                <span className="text-[10px] uppercase tracking-wide text-foreground/40">
                  {offer.label}
                </span>
                <span className="font-mono text-2xl font-bold text-gold">+{offer.points}</span>
                <span className="text-[10px] text-blood-light/70">
                  +{Math.round(offer.riskIncrease * 100)}% risque
                </span>
              </motion.button>
            ))}
          </div>

          <div className="flex items-center justify-center gap-2">
            <button
              onClick={handleStabilize}
              className="flex items-center gap-1.5 rounded-lg border border-ash/30 bg-ash/10 px-4 py-2 text-xs text-foreground/60 transition-colors active:bg-ash/20"
            >
              🛡 Stabiliser
              <span className="text-blood-light/60">(−{AVARICE.STABILIZE_COST}pts)</span>
            </button>
            {lastGain > 0 && (
              <motion.button
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={handleBet}
                className="flex items-center gap-1.5 rounded-lg border border-gold-muted/30 bg-gold-muted/5 px-4 py-2 text-xs text-gold-muted transition-colors active:bg-gold-muted/15"
              >
                🎲 Miser
                <span className="font-mono">{lastGain}pts</span>
              </motion.button>
            )}
          </div>
        </div>
      )}

      {/* Collapse / win message */}
      {collapsed && !won && (
        <motion.div
          initial={{ opacity: 0, scale: 1.5 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-2 text-center"
        >
          <p className="animate-text-glitch text-3xl font-bold text-blood-light">
            DÉFAITE
          </p>
          <p className="max-w-xs text-sm text-foreground/40">
            Tu n&apos;as pas atteint {AVARICE.TARGET_SCORE} pts en {AVARICE.MAX_TURNS} tours.
            L&apos;avidité a consumé ta chance de sauver Antoine.
          </p>
        </motion.div>
      )}

      {/* Round log */}
      <div className="w-full max-w-md">
        <p className="mb-1 text-[10px] uppercase tracking-wider text-foreground/20">
          Historique
        </p>
        <div className="max-h-28 overflow-y-auto rounded-lg border border-ash/15 bg-void/30 p-2">
          {log.length === 0 && (
            <p className="text-center text-[10px] text-foreground/15">Aucune action</p>
          )}
          {log
            .slice()
            .reverse()
            .map((entry, i) => (
              <div
                key={i}
                className="mb-0.5 flex items-center justify-between border-b border-ash/10 pb-0.5 text-[11px] text-foreground/40"
              >
                <span>
                  {entry.action === 'accumulate' ? '💰' : entry.action === 'stabilize' ? '🛡' : '🎲'}{' '}
                  {entry.detail}
                </span>
                <span className="font-mono">{entry.score}</span>
              </div>
            ))}
        </div>
      </div>
    </motion.div>
  );
}
