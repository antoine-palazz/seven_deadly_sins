'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import Timer from '@/src/components/ui/Timer';
import { PARESSE } from '@/src/utils/constants';
import { audioManager } from '@/src/utils/audio';

interface ParesseGameProps {
  onWin: () => void;
  onLose: () => void;
}

interface PuzzleCell {
  value: number; // 0 = empty, 1-N = value
  given: boolean;
  cursed: boolean;
  cursedDisplay: number;
}

type Grid = PuzzleCell[][];

/* ─── Latin-square generation ─── */

function generateLatinSquare(size: number): number[][] {
  const grid: number[][] = [];
  const base = Array.from({ length: size }, (_, i) => i + 1);

  // Shuffle base row
  for (let i = base.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [base[i], base[j]] = [base[j], base[i]];
  }

  for (let r = 0; r < size; r++) {
    grid[r] = [];
    for (let c = 0; c < size; c++) {
      grid[r][c] = base[(c + r) % size];
    }
  }

  // Shuffle rows
  for (let i = size - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [grid[i], grid[j]] = [grid[j], grid[i]];
  }

  // Shuffle columns
  for (let i = size - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    for (let r = 0; r < size; r++) {
      [grid[r][i], grid[r][j]] = [grid[r][j], grid[r][i]];
    }
  }

  return grid;
}

/* ─── Solver: counts solutions (stops at 2) to verify uniqueness ─── */

function countSolutions(
  board: number[][],
  size: number,
  limit: number = 2
): number {
  // Find first empty cell
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (board[r][c] !== 0) continue;

      let count = 0;
      for (let val = 1; val <= size; val++) {
        if (isValid(board, size, r, c, val)) {
          board[r][c] = val;
          count += countSolutions(board, size, limit - count);
          board[r][c] = 0;
          if (count >= limit) return count;
        }
      }
      return count;
    }
  }
  return 1; // no empty cell → found a solution
}

function isValid(
  board: number[][],
  size: number,
  row: number,
  col: number,
  val: number
): boolean {
  for (let c = 0; c < size; c++) {
    if (board[row][c] === val) return false;
  }
  for (let r = 0; r < size; r++) {
    if (board[r][col] === val) return false;
  }
  return true;
}

/* ─── Puzzle generation with guaranteed unique solution ─── */

function generatePuzzle(size: number): { puzzle: Grid; solution: number[][] } {
  const solution = generateLatinSquare(size);

  // Start with all cells given, then remove one by one
  const board = solution.map((row) => [...row]);

  // Collect removable cell indices in random order
  const cells: [number, number][] = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      cells.push([r, c]);
    }
  }
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }

  // Remove cells while solution remains unique
  for (const [r, c] of cells) {
    const saved = board[r][c];
    board[r][c] = 0;

    if (countSolutions(board.map((row) => [...row]), size) !== 1) {
      board[r][c] = saved; // put it back
    }
  }

  // Build puzzle grid
  const puzzle: Grid = [];
  for (let r = 0; r < size; r++) {
    puzzle[r] = [];
    for (let c = 0; c < size; c++) {
      const val = board[r][c];
      puzzle[r][c] = {
        value: val,
        given: val !== 0,
        cursed: false,
        cursedDisplay: 0,
      };
    }
  }

  return { puzzle, solution };
}

/* ─── Component ─── */

export default function ParesseGame({ onWin, onLose }: ParesseGameProps) {
  const size = PARESSE.GRID_SIZE;
  const [{ puzzle, solution }] = useState(() => generatePuzzle(size));
  const [grid, setGrid] = useState<Grid>(puzzle);
  const [selectedCell, setSelectedCell] = useState<[number, number] | null>(null);
  const [running, setRunning] = useState(true);
  const [inputDelay, setInputDelay] = useState(false);
  const [cursedActive, setCursedActive] = useState(false);
  const gameOverRef = useRef(false);
  const [distortion, setDistortion] = useState(1);

  // Time distortion
  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => {
      setDistortion(
        PARESSE.DISTORTION_MIN +
        Math.random() * (PARESSE.DISTORTION_MAX - PARESSE.DISTORTION_MIN)
      );
    }, 5000);
    return () => clearInterval(interval);
  }, [running]);

  // Cursed cells: periodically swap display of some player-placed cells
  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => {
      setCursedActive(true);
      setGrid((prev) => {
        const newGrid = prev.map((row) => row.map((cell) => ({ ...cell })));
        const filledCells: [number, number][] = [];
        for (let r = 0; r < size; r++) {
          for (let c = 0; c < size; c++) {
            if (!newGrid[r][c].given && newGrid[r][c].value > 0) {
              filledCells.push([r, c]);
            }
          }
        }

        const numToCurse = Math.min(3, filledCells.length);
        for (let i = filledCells.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [filledCells[i], filledCells[j]] = [filledCells[j], filledCells[i]];
        }

        for (let i = 0; i < numToCurse; i++) {
          const [r, c] = filledCells[i];
          let fakeVal = Math.floor(Math.random() * size) + 1;
          while (fakeVal === newGrid[r][c].value) {
            fakeVal = Math.floor(Math.random() * size) + 1;
          }
          newGrid[r][c].cursed = true;
          newGrid[r][c].cursedDisplay = fakeVal;
        }

        return newGrid;
      });

      setTimeout(() => {
        setCursedActive(false);
        setGrid((prev) =>
          prev.map((row) =>
            row.map((cell) => ({ ...cell, cursed: false, cursedDisplay: 0 }))
          )
        );
      }, PARESSE.CURSE_DURATION * 1000);
    }, PARESSE.CURSE_INTERVAL * 1000);

    return () => clearInterval(interval);
  }, [running, size]);

  const handleCellClick = useCallback(
    (r: number, c: number) => {
      if (!running || grid[r][c].given || inputDelay) return;
      setSelectedCell((prev) =>
        prev && prev[0] === r && prev[1] === c ? null : [r, c]
      );
    },
    [running, grid, inputDelay]
  );

  const handleNumberInput = useCallback(
    (num: number) => {
      if (!selectedCell || !running || inputDelay) return;
      const [r, c] = selectedCell;
      if (grid[r][c].given) return;

      setInputDelay(true);
      setTimeout(() => setInputDelay(false), PARESSE.INPUT_DELAY);

      setGrid((prev) => {
        const newGrid = prev.map((row) => row.map((cell) => ({ ...cell })));
        newGrid[r][c] = { ...newGrid[r][c], value: num };
        return newGrid;
      });

      if (audioManager) audioManager.playClick();
      setSelectedCell(null);
    },
    [selectedCell, running, inputDelay, grid]
  );

  const handleClear = useCallback(() => {
    if (!selectedCell || !running || inputDelay) return;
    const [r, c] = selectedCell;
    if (grid[r][c].given) return;

    setGrid((prev) => {
      const newGrid = prev.map((row) => row.map((cell) => ({ ...cell })));
      newGrid[r][c] = { ...newGrid[r][c], value: 0 };
      return newGrid;
    });
  }, [selectedCell, running, inputDelay, grid]);

  const handleSubmit = useCallback(() => {
    if (gameOverRef.current) return;
    gameOverRef.current = true;
    setRunning(false);

    let correct = true;
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (grid[r][c].value !== solution[r][c]) {
          correct = false;
          break;
        }
      }
      if (!correct) break;
    }

    if (correct) {
      if (audioManager) audioManager.playSuccess();
      onWin();
    } else {
      if (audioManager) audioManager.playError();
      onLose();
    }
  }, [grid, solution, size, onWin, onLose]);

  const handleTimeUp = useCallback(() => {
    if (gameOverRef.current) return;
    gameOverRef.current = true;
    setRunning(false);
    onLose();
  }, [onLose]);

  const allFilled = grid.every((row) => row.every((cell) => cell.value > 0));

  const getConflicts = (r: number, c: number): boolean => {
    const val = grid[r][c].value;
    if (val === 0) return false;
    for (let cc = 0; cc < size; cc++) {
      if (cc !== c && grid[r][cc].value === val) return true;
    }
    for (let rr = 0; rr < size; rr++) {
      if (rr !== r && grid[rr][c].value === val) return true;
    }
    return false;
  };

  const givenCount = grid.flat().filter((c) => c.given).length;
  const filledCount = grid.flat().filter((c) => c.value > 0).length;
  const totalCells = size * size;

  const cellSize = Math.min(
    50,
    Math.floor(
      (typeof window !== 'undefined'
        ? Math.min(window.innerWidth - 48, 360)
        : 310) / size
    )
  );

  return (
    <div className="flex min-h-dvh flex-col items-center gap-4 px-4 pt-16 pb-8">
      {/* Header */}
      <div className="flex w-full max-w-lg items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">Paresse</h2>
          <p className="text-xs text-foreground/40">
            Chaque nombre (1-{size}) une seule fois par ligne et colonne.
          </p>
        </div>
        <Timer
          duration={PARESSE.BASE_TIME}
          running={running}
          onTimeUp={handleTimeUp}
          distortion={distortion}
        />
      </div>

      {/* Progress */}
      <div className="flex items-center gap-3 text-xs text-foreground/30">
        <span>
          {filledCount}/{totalCells} remplis
        </span>
        {cursedActive && (
          <motion.span
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ repeat: Infinity, duration: 0.5 }}
            className="text-blood-light"
          >
            ⚠ Cellules maudites
          </motion.span>
        )}
        {inputDelay && (
          <span className="text-gold-muted">Délai...</span>
        )}
      </div>

      {/* Grid */}
      <div
        className="grid gap-[2px] rounded-lg border border-ash/30 bg-ash/20 p-1"
        style={{
          gridTemplateColumns: `repeat(${size}, ${cellSize}px)`,
          gridTemplateRows: `repeat(${size}, ${cellSize}px)`,
        }}
      >
        {grid.map((row, r) =>
          row.map((cell, c) => {
            const isSelected =
              selectedCell?.[0] === r && selectedCell?.[1] === c;
            const conflict = getConflicts(r, c);
            const displayVal =
              cell.cursed && cell.cursedDisplay > 0
                ? cell.cursedDisplay
                : cell.value;

            return (
              <motion.button
                key={`${r}-${c}`}
                onClick={() => handleCellClick(r, c)}
                className={`flex items-center justify-center rounded font-mono text-base font-bold transition-all ${
                  cell.given
                    ? 'bg-ash/30 text-foreground/70'
                    : isSelected
                    ? 'bg-gold-muted/30 text-gold ring-1 ring-gold/40'
                    : conflict
                    ? 'bg-blood/20 text-blood-light'
                    : cell.value > 0
                    ? cell.cursed
                      ? 'bg-purple-900/20 text-purple-300'
                      : 'bg-void text-foreground/60'
                    : 'bg-void/50 text-foreground/20'
                }`}
                style={{ width: cellSize, height: cellSize }}
                whileTap={cell.given ? {} : { scale: 0.9 }}
              >
                {displayVal > 0 ? displayVal : ''}
              </motion.button>
            );
          })
        )}
      </div>

      <p className="text-[10px] text-foreground/20">
        {givenCount} indices fournis — solution unique garantie
      </p>

      {/* Number input */}
      {selectedCell && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap justify-center gap-2"
        >
          {Array.from({ length: size }, (_, i) => i + 1).map((num) => (
            <button
              key={num}
              onClick={() => handleNumberInput(num)}
              disabled={inputDelay}
              className="flex h-11 w-11 items-center justify-center rounded-lg border border-gold-muted/30 bg-gold-muted/10 font-mono text-lg text-gold transition-all active:bg-gold-muted/30 disabled:opacity-30"
            >
              {num}
            </button>
          ))}
          <button
            onClick={handleClear}
            disabled={inputDelay}
            className="flex h-11 w-11 items-center justify-center rounded-lg border border-blood/30 bg-blood/10 text-sm text-blood-light transition-all active:bg-blood/30 disabled:opacity-30"
          >
            ✕
          </button>
        </motion.div>
      )}

      {/* Submit */}
      {allFilled && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={handleSubmit}
          className="mt-2 animate-pulse-glow rounded-lg border border-gold/50 bg-gold-muted/20 px-8 py-3 font-serif text-lg text-gold active:bg-gold-muted/40"
        >
          Valider
        </motion.button>
      )}
    </div>
  );
}
