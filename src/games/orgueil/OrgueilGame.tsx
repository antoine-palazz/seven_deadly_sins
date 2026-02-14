'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Timer from '@/src/components/ui/Timer';
import { ORGUEIL } from '@/src/utils/constants';
import { shuffle, randInt } from '@/src/utils/helpers';
import { audioManager } from '@/src/utils/audio';

interface Tile {
  id: number;
  realValue: number;
  /** Current displayed value (may flicker) */
  displayValue: number;
  isFake: boolean;
  /** Fake tiles always flicker to this consistent alt-value */
  altValue?: number;
}

interface OrgueilGameProps {
  onWin: () => void;
  onLose: () => void;
}

let tileIdCounter = 0;

function generateTileBatch(realCount: number, fakeCount: number, usedValues: Set<number>): Tile[] {
  const tiles: Tile[] = [];

  while (tiles.filter((t) => !t.isFake).length < realCount) {
    const val = randInt(1, 60);
    if (!usedValues.has(val)) {
      usedValues.add(val);
      tiles.push({
        id: tileIdCounter++,
        realValue: val,
        displayValue: val,
        isFake: false,
      });
    }
  }

  while (tiles.filter((t) => t.isFake).length < fakeCount) {
    const fakeVal = randInt(1, 60);
    let alt = randInt(1, 60);
    while (alt === fakeVal || usedValues.has(alt)) {
      alt = randInt(1, 60);
    }
    if (!usedValues.has(fakeVal)) {
      usedValues.add(fakeVal);
      tiles.push({
        id: tileIdCounter++,
        realValue: fakeVal,
        displayValue: fakeVal,
        isFake: true,
        altValue: alt,
      });
    }
  }

  return shuffle(tiles);
}

// Module-level set for uniqueness within a run
let usedValuesSet = new Set<number>();

export default function OrgueilGame({ onWin, onLose }: OrgueilGameProps) {
  const [tiles, setTiles] = useState<Tile[]>(() => {
    tileIdCounter = 0;
    usedValuesSet = new Set<number>();
    return generateTileBatch(ORGUEIL.REAL_COUNT, ORGUEIL.FAKE_COUNT, usedValuesSet);
  });
  const [sortedSlots, setSortedSlots] = useState<Tile[]>([]);
  const [discarded, setDiscarded] = useState<Tile[]>([]);
  const [running, setRunning] = useState(true);
  const [selectedTile, setSelectedTile] = useState<Tile | null>(null);
  const [timePenalty, setTimePenalty] = useState(0);
  const [shake, setShake] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'error' | 'warn'; msg: string } | null>(null);
  const doneRef = useRef(false);

  // Flicker effect: ALL tiles flicker every ~1.2s.
  // Real tiles flicker to random values; fakes flicker to their consistent altValue.
  useEffect(() => {
    if (!running) return;

    const interval = setInterval(() => {
      setTiles((prev) =>
        prev.map((t) => {
          if (t.isFake && t.altValue !== undefined) {
            // Fake: alternate between realValue and consistent altValue
            return {
              ...t,
              displayValue: t.displayValue === t.realValue ? t.altValue : t.realValue,
            };
          } else {
            // Real: briefly flash a random value, then restore
            const shouldFlicker = Math.random() > 0.55;
            if (shouldFlicker) {
              return { ...t, displayValue: randInt(1, 60) };
            }
            return { ...t, displayValue: t.realValue };
          }
        })
      );

      // Restore real tiles after 150ms
      setTimeout(() => {
        setTiles((prev) =>
          prev.map((t) => {
            if (!t.isFake) {
              return { ...t, displayValue: t.realValue };
            }
            return t;
          })
        );
      }, 150);
    }, 1200);

    return () => clearInterval(interval);
  }, [running]);

  const showFeedback = useCallback((type: 'error' | 'warn', msg: string) => {
    setFeedback({ type, msg });
    setTimeout(() => setFeedback(null), 1500);
  }, []);

  const handleTileClick = useCallback(
    (tile: Tile) => {
      if (!running) return;
      if (audioManager) audioManager.playClick();
      setSelectedTile((prev) => (prev?.id === tile.id ? null : tile));
    },
    [running]
  );

  const handlePlaceInOrder = useCallback(() => {
    if (!selectedTile || !running) return;

    if (selectedTile.isFake) {
      showFeedback('warn', 'Quelque chose ne va pas avec ce nombre...');
    }

    const newTiles = tiles.filter((t) => t.id !== selectedTile.id);
    const newSorted = [...sortedSlots, { ...selectedTile, displayValue: selectedTile.realValue }];
    setTiles(newTiles);
    setSortedSlots(newSorted);
    setSelectedTile(null);
  }, [selectedTile, running, tiles, sortedSlots, showFeedback]);

  const handleDiscard = useCallback(() => {
    if (!selectedTile || !running) return;

    if (!selectedTile.isFake) {
      if (audioManager) audioManager.playError();
      setTimePenalty((p) => p + ORGUEIL.WRONG_DISCARD_PENALTY);
      setShake(true);
      setTimeout(() => setShake(false), 500);
      showFeedback('error', `Erreur ! -${ORGUEIL.WRONG_DISCARD_PENALTY}s`);
    } else {
      if (audioManager) audioManager.playSuccess();
    }

    const newTiles = tiles.filter((t) => t.id !== selectedTile.id);
    setTiles(newTiles);
    setDiscarded((prev) => [...prev, selectedTile]);
    setSelectedTile(null);
  }, [selectedTile, running, tiles, showFeedback]);

  const handleUndoLast = useCallback(() => {
    if (sortedSlots.length === 0) return;
    const last = sortedSlots[sortedSlots.length - 1];
    setSortedSlots((prev) => prev.slice(0, -1));
    setTiles((prev) => [...prev, last]);
  }, [sortedSlots]);

  const checkResult = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    setRunning(false);

    // All fakes must be discarded
    const fakesInSorted = sortedSlots.filter((t) => t.isFake).length;
    const noFakesInSorted = fakesInSorted === 0;

    if (!noFakesInSorted) {
      onLose();
      return;
    }

    // Sorted slots must be in ascending order by realValue
    const isAscending = sortedSlots.every(
      (t, i) => i === 0 || t.realValue > sortedSlots[i - 1].realValue
    );

    if (isAscending && sortedSlots.length >= ORGUEIL.REAL_COUNT) {
      onWin();
    } else {
      onLose();
    }
  }, [sortedSlots, onWin, onLose]);

  const handleSubmit = useCallback(() => {
    if (tiles.length === 0) {
      checkResult();
    }
  }, [tiles, checkResult]);

  const allPlaced = tiles.length === 0;
  const effectiveDuration = Math.max(10, ORGUEIL.TIME_LIMIT - timePenalty);

  return (
    <motion.div
      className="flex min-h-dvh flex-col items-center gap-4 px-4 pt-16 pb-8"
      animate={shake ? { x: [0, -8, 8, -5, 5, 0] } : {}}
      transition={{ duration: 0.4 }}
    >
      {/* Header */}
      <div className="flex w-full max-w-lg items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">Orgueil</h2>
          <p className="text-xs text-foreground/40">
            Trie les vrais. Écarte les imposteurs.
          </p>
        </div>
        <Timer
          duration={effectiveDuration}
          running={running}
          onTimeUp={() => {
            if (!doneRef.current) {
              doneRef.current = true;
              setRunning(false);
              onLose();
            }
          }}
        />
      </div>

      <div className="w-full max-w-lg rounded-lg border border-ash/30 bg-void/40 px-3 py-2 text-xs text-foreground/50">
        <span className="text-gold-muted">Indice</span> : un imposteur « clignote » toujours vers le <span className="text-foreground/70">même</span> autre nombre. Un vrai nombre clignote vers des valeurs aléatoires.
      </div>

      {/* Feedback */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`rounded px-4 py-2 text-sm font-bold ${
              feedback.type === 'error'
                ? 'bg-blood/30 text-blood-light'
                : 'bg-gold-muted/20 text-gold-muted'
            }`}
          >
            {feedback.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Available tiles pool */}
      <div className="w-full max-w-lg">
        <p className="mb-2 text-xs uppercase tracking-wider text-foreground/30">
          Nombres disponibles ({tiles.length})
        </p>
        <div className="flex min-h-[80px] flex-wrap gap-2 rounded-lg border border-ash/30 bg-void/50 p-3">
          <AnimatePresence>
            {tiles.map((tile) => (
              <motion.button
                key={tile.id}
                layout
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => handleTileClick(tile)}
                className={`game-tile font-mono text-sm font-bold transition-all ${
                  selectedTile?.id === tile.id
                    ? 'border-gold bg-gold-muted/20 text-gold'
                    : 'bg-ash/30 text-foreground/80'
                }`}
              >
                {tile.displayValue}
              </motion.button>
            ))}
          </AnimatePresence>
          {tiles.length === 0 && (
            <p className="w-full text-center text-xs text-foreground/20">Vide</p>
          )}
        </div>
      </div>

      {/* Action buttons */}
      {selectedTile && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex gap-3"
        >
          <button
            onClick={handlePlaceInOrder}
            className="rounded border border-green-800/50 bg-green-900/20 px-4 py-2 text-sm text-green-300 active:bg-green-900/40"
          >
            Placer →
          </button>
          <button
            onClick={handleDiscard}
            className="rounded border border-blood/50 bg-blood/20 px-4 py-2 text-sm text-blood-light active:bg-blood/40"
          >
            Écarter ✕
          </button>
        </motion.div>
      )}

      {/* Sorted order */}
      <div className="w-full max-w-lg">
        <p className="mb-2 text-xs uppercase tracking-wider text-foreground/30">
          Ordre croissant ({sortedSlots.filter((t) => !t.isFake).length}/{ORGUEIL.REAL_COUNT})
        </p>
        <div className="flex min-h-[60px] flex-wrap gap-2 rounded-lg border border-green-900/30 bg-green-950/20 p-3">
          {sortedSlots.map((tile, i) => (
            <motion.div
              key={tile.id}
              layout
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="game-tile border-green-800/40 bg-green-900/20 font-mono text-sm text-green-300"
            >
              <span className="mr-1 text-[10px] text-foreground/20">{i + 1}.</span>
              {tile.displayValue}
            </motion.div>
          ))}
          {sortedSlots.length === 0 && (
            <p className="w-full text-center text-xs text-foreground/20">
              Place les nombres ici en ordre croissant
            </p>
          )}
        </div>
        {sortedSlots.length > 0 && (
          <button
            onClick={handleUndoLast}
            className="mt-1 text-xs text-foreground/30 underline"
          >
            Annuler le dernier
          </button>
        )}
      </div>

      {/* Discarded pile */}
      <div className="w-full max-w-lg">
        <p className="mb-2 text-xs uppercase tracking-wider text-foreground/30">
          Écartés ({discarded.length})
        </p>
        <div className="flex min-h-[44px] flex-wrap gap-2 rounded-lg border border-blood/20 bg-blood/5 p-3">
          {discarded.map((tile) => (
            <motion.div
              key={tile.id}
              layout
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className={`game-tile font-mono text-sm line-through ${
                tile.isFake
                  ? 'border-green-800/30 bg-green-900/10 text-green-400'
                  : 'border-blood/30 bg-blood/10 text-blood-light'
              }`}
            >
              {tile.realValue}
            </motion.div>
          ))}
          {discarded.length === 0 && (
            <p className="w-full text-center text-xs text-foreground/20">
              Écarte les faux nombres ici
            </p>
          )}
        </div>
      </div>

      {/* Submit */}
      {allPlaced && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={handleSubmit}
          className="mt-4 animate-pulse-glow rounded-lg border border-gold/50 bg-gold-muted/20 px-8 py-3 font-serif text-lg text-gold active:bg-gold-muted/40"
        >
          Valider
        </motion.button>
      )}
    </motion.div>
  );
}
