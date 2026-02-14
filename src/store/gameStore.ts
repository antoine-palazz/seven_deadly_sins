'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface GameState {
  /** Index of the highest unlocked trial (0-6) */
  currentTrial: number;
  /** Which trials have been completed */
  completedTrials: boolean[];
  /** Numeric fragments collected (null = not yet earned) */
  fragments: (number | null)[];
  /** Audio master toggle */
  audioEnabled: boolean;
  /** Whisper layer toggle */
  whispersEnabled: boolean;
  /** Whether the intro has been seen */
  introSeen: boolean;
  /** Whether the final judgment has been passed */
  judgmentPassed: boolean;

  /* ── Actions ── */
  completeTrial: (index: number, fragment: number) => void;
  resetTrial: (index: number) => void;
  resetAll: () => void;
  setAudioEnabled: (v: boolean) => void;
  setWhispersEnabled: (v: boolean) => void;
  setIntroSeen: () => void;
  setJudgmentPassed: () => void;
}

const INITIAL: Pick<
  GameState,
  | 'currentTrial'
  | 'completedTrials'
  | 'fragments'
  | 'audioEnabled'
  | 'whispersEnabled'
  | 'introSeen'
  | 'judgmentPassed'
> = {
  currentTrial: 0,
  completedTrials: Array(7).fill(false),
  fragments: Array(7).fill(null),
  audioEnabled: true,
  whispersEnabled: false,
  introSeen: false,
  judgmentPassed: false,
};

export const useGameStore = create<GameState>()(
  persist(
    (set) => ({
      ...INITIAL,

      completeTrial: (index, fragment) =>
        set((s) => {
          const completedTrials = [...s.completedTrials];
          const fragments = [...s.fragments];
          completedTrials[index] = true;
          fragments[index] = fragment;
          const currentTrial = Math.min(
            Math.max(s.currentTrial, index + 1),
            6
          );
          return { completedTrials, fragments, currentTrial };
        }),

      resetTrial: (index) =>
        set((s) => {
          const completedTrials = [...s.completedTrials];
          const fragments = [...s.fragments];
          completedTrials[index] = false;
          fragments[index] = null;
          return { completedTrials, fragments };
        }),

      resetAll: () => set({ ...INITIAL }),

      setAudioEnabled: (v) => set({ audioEnabled: v }),
      setWhispersEnabled: (v) => set({ whispersEnabled: v }),
      setIntroSeen: () => set({ introSeen: true }),
      setJudgmentPassed: () => set({ judgmentPassed: true }),
    }),
    {
      name: 'seven-deadly-sins-progress',
    }
  )
);
