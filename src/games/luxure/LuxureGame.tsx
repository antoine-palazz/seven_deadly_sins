'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LUXURE } from '@/src/utils/constants';
import { isPrime, randInt } from '@/src/utils/helpers';
import { audioManager } from '@/src/utils/audio';

interface LuxureGameProps {
  onWin: () => void;
  onLose: () => void;
}

interface Cell {
  row: number;
  col: number;
  value: number;
  walls: { top: boolean; right: boolean; bottom: boolean; left: boolean };
  onPath: boolean;
}

type Grid = Cell[][];

/**
 * Generate a maze using recursive backtracker (DFS).
 * Guarantees a path from (0,0) to the center.
 */
function generateMaze(size: number): Grid {
  const grid: Grid = [];
  for (let r = 0; r < size; r++) {
    grid[r] = [];
    for (let c = 0; c < size; c++) {
      grid[r][c] = {
        row: r,
        col: c,
        value: 0,
        walls: { top: true, right: true, bottom: true, left: true },
        onPath: false,
      };
    }
  }

  const visited = Array.from({ length: size }, () => Array(size).fill(false));
  const stack: [number, number][] = [];

  const start: [number, number] = [0, 0];
  visited[start[0]][start[1]] = true;
  stack.push(start);

  const directions: [number, number, 'top' | 'right' | 'bottom' | 'left', 'top' | 'right' | 'bottom' | 'left'][] = [
    [-1, 0, 'top', 'bottom'],
    [0, 1, 'right', 'left'],
    [1, 0, 'bottom', 'top'],
    [0, -1, 'left', 'right'],
  ];

  while (stack.length > 0) {
    const [cr, cc] = stack[stack.length - 1];
    const neighbors: [number, number, number][] = [];

    for (let di = 0; di < directions.length; di++) {
      const [dr, dc] = directions[di];
      const nr = cr + dr;
      const nc = cc + dc;
      if (nr >= 0 && nr < size && nc >= 0 && nc < size && !visited[nr][nc]) {
        neighbors.push([nr, nc, di]);
      }
    }

    if (neighbors.length === 0) {
      stack.pop();
    } else {
      const [nr, nc, di] = neighbors[Math.floor(Math.random() * neighbors.length)];
      const [, , wallFrom, wallTo] = directions[di];
      grid[cr][cc].walls[wallFrom] = false;
      grid[nr][nc].walls[wallTo] = false;
      visited[nr][nc] = true;
      stack.push([nr, nc]);
    }
  }

  // Assign numbers: use BFS from start to find the path to center
  const center = Math.floor(size / 2);
  const pathCells = bfsPath(grid, size, [0, 0], [center, center]);

  // Mark path cells
  for (const [r, c] of pathCells) {
    grid[r][c].onPath = true;
  }

  // Assign prime numbers to path cells, non-prime to others
  const primes = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47];
  const nonPrimes = [4, 6, 8, 9, 10, 12, 14, 15, 16, 18, 20, 21, 22, 24, 25, 26, 27, 28, 30];

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c].onPath) {
        grid[r][c].value = primes[Math.floor(Math.random() * primes.length)];
      } else {
        // Mix: some non-path cells get primes too (to make it less obvious)
        if (Math.random() < 0.3) {
          grid[r][c].value = primes[Math.floor(Math.random() * primes.length)];
        } else {
          grid[r][c].value = nonPrimes[Math.floor(Math.random() * nonPrimes.length)];
        }
      }
    }
  }

  return grid;
}

function bfsPath(grid: Grid, size: number, start: [number, number], end: [number, number]): [number, number][] {
  const visited = Array.from({ length: size }, () => Array(size).fill(false));
  const parent = Array.from({ length: size }, () => Array<[number, number] | null>(size).fill(null));
  const queue: [number, number][] = [start];
  visited[start[0]][start[1]] = true;

  const dirs: [number, number, 'top' | 'right' | 'bottom' | 'left'][] = [
    [-1, 0, 'top'],
    [0, 1, 'right'],
    [1, 0, 'bottom'],
    [0, -1, 'left'],
  ];

  while (queue.length > 0) {
    const [cr, cc] = queue.shift()!;
    if (cr === end[0] && cc === end[1]) break;

    for (const [dr, dc, wall] of dirs) {
      const nr = cr + dr;
      const nc = cc + dc;
      if (nr >= 0 && nr < size && nc >= 0 && nc < size && !visited[nr][nc] && !grid[cr][cc].walls[wall]) {
        visited[nr][nc] = true;
        parent[nr][nc] = [cr, cc];
        queue.push([nr, nc]);
      }
    }
  }

  // Reconstruct path
  const path: [number, number][] = [];
  let cur: [number, number] | null = end;
  while (cur) {
    path.unshift(cur);
    cur = parent[cur[0]][cur[1]];
  }
  return path;
}

export default function LuxureGame({ onWin, onLose }: LuxureGameProps) {
  const size = LUXURE.GRID_SIZE;
  const center = Math.floor(size / 2);
  const [grid, setGrid] = useState<Grid>(() => generateMaze(size));
  const [playerPos, setPlayerPos] = useState<[number, number]>([0, 0]);
  const [movesLeft, setMovesLeft] = useState<number>(LUXURE.MAX_MOVES);
  const [visibility, setVisibility] = useState(2);
  const moveCountRef = useRef(0);
  const [distraction, setDistraction] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const gameOverRef = useRef(false);

  const performGridShift = useCallback(() => {
    setGrid((prev) => {
      const newGrid = prev.map((row) => row.map((cell) => ({ ...cell })));
      const isRow = Math.random() < 0.5;
      const idx = randInt(0, size - 1);

      if (isRow) {
        const row = newGrid[idx].map((c) => ({ ...c }));
        for (let c = 0; c < size; c++) {
          const srcCol = (c - 1 + size) % size;
          newGrid[idx][c] = { ...row[srcCol], row: idx, col: c };
        }
      } else {
        const col = Array.from({ length: size }, (_, r) => ({ ...newGrid[r][idx] }));
        for (let r = 0; r < size; r++) {
          const srcRow = (r - 1 + size) % size;
          newGrid[r][idx] = { ...col[srcRow], row: r, col: idx };
        }
      }
      return newGrid;
    });

    setDistraction(true);
    setTimeout(() => setDistraction(false), 1500);
  }, [size]);

  const showFeedback = useCallback((msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 1000);
  }, []);

  const tryMove = useCallback(
    (dr: number, dc: number) => {
      if (gameOverRef.current) return;

      const [pr, pc] = playerPos;
      const nr = pr + dr;
      const nc = pc + dc;

      // Check bounds
      if (nr < 0 || nr >= size || nc < 0 || nc >= size) return;

      // Check wall
      const wallDir: 'top' | 'right' | 'bottom' | 'left' =
        dr === -1 ? 'top' : dr === 1 ? 'bottom' : dc === -1 ? 'left' : 'right';

      if (grid[pr][pc].walls[wallDir]) {
        showFeedback('Mur !');
        return;
      }

      // Move is valid
      const cellValue = grid[nr][nc].value;
      let newMoves = movesLeft - 1;

      if (!isPrime(cellValue)) {
        // Non-prime penalty: lose extra moves and reduce visibility
        newMoves -= LUXURE.NON_PRIME_PENALTY;
        if (visibility > 1) setVisibility((v) => v - 1);
        showFeedback(`${cellValue} n'est pas premier ! -${LUXURE.NON_PRIME_PENALTY + 1} mouvements`);
        if (audioManager) audioManager.playError();
      } else {
        if (audioManager) audioManager.playClick();
      }

      if (newMoves <= 0) {
        gameOverRef.current = true;
        setMovesLeft(0);
        setPlayerPos([nr, nc]);
        onLose();
        return;
      }

      setMovesLeft(newMoves);
      setPlayerPos([nr, nc]);
      moveCountRef.current += 1;

      // Trigger grid shift at intervals
      if (moveCountRef.current % LUXURE.SHIFT_INTERVAL === 0) {
        performGridShift();
      }

      // Check win
      if (nr === center && nc === center) {
        gameOverRef.current = true;
        if (audioManager) audioManager.playSuccess();
        onWin();
      }
    },
    [playerPos, grid, movesLeft, visibility, size, center, showFeedback, performGridShift, onWin, onLose]
  );

  // Keyboard controls
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
          e.preventDefault();
          tryMove(-1, 0);
          break;
        case 'ArrowDown':
        case 's':
          e.preventDefault();
          tryMove(1, 0);
          break;
        case 'ArrowLeft':
        case 'a':
          e.preventDefault();
          tryMove(0, -1);
          break;
        case 'ArrowRight':
        case 'd':
          e.preventDefault();
          tryMove(0, 1);
          break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [tryMove]);

  const isVisible = (r: number, c: number) => {
    const dist = Math.abs(r - playerPos[0]) + Math.abs(c - playerPos[1]);
    return dist <= visibility;
  };

  const cellSize = Math.min(48, Math.floor((window?.innerWidth ? Math.min(window.innerWidth - 40, 400) : 350) / size));

  return (
    <div className="flex min-h-dvh flex-col items-center gap-4 px-4 pt-16 pb-8">
      {/* Header */}
      <div className="flex w-full max-w-lg items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">Luxure</h2>
          <p className="text-xs text-foreground/40">
            Atteins le centre. Seuls les nombres premiers sont sûrs.
          </p>
        </div>
        <div className="text-right">
          <p className="font-mono text-lg text-gold">{movesLeft}</p>
          <p className="text-[10px] text-foreground/30">mouvements</p>
        </div>
      </div>

      {/* Feedback */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded bg-blood/20 px-3 py-1 text-sm text-blood-light"
          >
            {feedback}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Distraction overlay */}
      <AnimatePresence>
        {distraction && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.7 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-blood/20 backdrop-blur-sm"
          >
            <motion.p
              animate={{ scale: [1, 1.3, 1], rotate: [0, 5, -5, 0] }}
              transition={{ repeat: Infinity, duration: 0.5 }}
              className="text-4xl font-bold text-blood-light"
            >
              Le labyrinthe change...
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Maze grid */}
      <div
        className="relative"
        style={{ width: cellSize * size, height: cellSize * size }}
      >
        {grid.map((row, r) =>
          row.map((cell, c) => {
            const visible = isVisible(r, c);
            const isPlayer = playerPos[0] === r && playerPos[1] === c;
            const isGoal = r === center && c === center;

            return (
              <motion.div
                key={`${r}-${c}`}
                className={`absolute flex items-center justify-center font-mono text-xs font-bold transition-opacity ${
                  visible ? 'opacity-100' : 'opacity-10'
                } ${isPlayer ? 'z-10' : ''}`}
                style={{
                  top: r * cellSize,
                  left: c * cellSize,
                  width: cellSize,
                  height: cellSize,
                  borderTop: cell.walls.top ? '2px solid #8B0000' : '1px solid rgba(139,0,0,0.15)',
                  borderRight: cell.walls.right ? '2px solid #8B0000' : '1px solid rgba(139,0,0,0.15)',
                  borderBottom: cell.walls.bottom ? '2px solid #8B0000' : '1px solid rgba(139,0,0,0.15)',
                  borderLeft: cell.walls.left ? '2px solid #8B0000' : '1px solid rgba(139,0,0,0.15)',
                  backgroundColor: isPlayer
                    ? 'rgba(184, 134, 11, 0.3)'
                    : isGoal
                    ? 'rgba(46, 139, 87, 0.2)'
                    : 'rgba(10, 10, 10, 0.5)',
                }}
                onClick={() => {
                  const dr = r - playerPos[0];
                  const dc = c - playerPos[1];
                  if (Math.abs(dr) + Math.abs(dc) === 1) {
                    tryMove(dr, dc);
                  }
                }}
              >
                {visible && (
                  <span
                    className={
                      isPlayer
                        ? 'text-gold'
                        : isGoal
                        ? 'text-green-400'
                        : isPrime(cell.value)
                        ? 'text-foreground/60'
                        : 'text-blood-light/60'
                    }
                  >
                    {isPlayer ? '◆' : isGoal ? '★' : cell.value}
                  </span>
                )}
              </motion.div>
            );
          })
        )}
      </div>

      {/* D-pad controls for mobile */}
      <div className="mt-4 grid grid-cols-3 gap-1">
        <div />
        <button
          onClick={() => tryMove(-1, 0)}
          className="flex h-12 w-12 items-center justify-center rounded bg-ash/30 text-foreground/60 active:bg-ash/50"
        >
          ↑
        </button>
        <div />
        <button
          onClick={() => tryMove(0, -1)}
          className="flex h-12 w-12 items-center justify-center rounded bg-ash/30 text-foreground/60 active:bg-ash/50"
        >
          ←
        </button>
        <div className="flex h-12 w-12 items-center justify-center text-[10px] text-foreground/20">
          {playerPos[0]},{playerPos[1]}
        </div>
        <button
          onClick={() => tryMove(0, 1)}
          className="flex h-12 w-12 items-center justify-center rounded bg-ash/30 text-foreground/60 active:bg-ash/50"
        >
          →
        </button>
        <div />
        <button
          onClick={() => tryMove(1, 0)}
          className="flex h-12 w-12 items-center justify-center rounded bg-ash/30 text-foreground/60 active:bg-ash/50"
        >
          ↓
        </button>
        <div />
      </div>
    </div>
  );
}
