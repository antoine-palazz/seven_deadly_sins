/* ─── Game Constants & Difficulty Curves ─── */

/** Orgueil: tile sorting with flicker detection */
export const ORGUEIL = {
  REAL_COUNT: 8,
  FAKE_COUNT: 3,
  TIME_LIMIT: 60,
  WRONG_DISCARD_PENALTY: 5, // seconds lost for discarding a real tile
} as const;

/** Avarice: risk/reward with turn limit, offers, bet, stabilize cost */
export const AVARICE = {
  TARGET_SCORE: 100,
  MAX_TURNS: 20,
  BASE_COLLAPSE_PROB: 0.05,
  POINTS_MIN: 6,
  POINTS_MID: 14,
  POINTS_MAX: 22,
  STABILIZE_COST: 5, // points lost when stabilizing
  STABILIZE_REDUCTION: 0.7, // multiply probability by this
} as const;

/** Luxure: maze with wall-based navigation, prime-only safe cells */
export const LUXURE = {
  GRID_SIZE: 7,
  MAX_MOVES: 20,
  SHIFT_INTERVAL: 5, // every N moves, shift a row/col
  NON_PRIME_PENALTY: 2, // extra moves lost for stepping on non-prime
} as const;

/** Envie: visual reaction game — spot the memorized target in a sequence */
export const ENVIE = {
  ROUNDS: 10,
  GHOST_SPEED_MIN: 300,
  GHOST_SPEED_MAX: 500,
  MEMORIZE_TIME: 1000, // ms to show target before sequence starts
  FLASH_DURATION: 600, // ms each number is shown in the sequence
} as const;

/** Gourmandise: falling number catcher with decay, poison, combo */
export const GOURMANDISE = {
  DURATION: 45,
  START_TOTAL: 100,
  SAFE_MIN: 60,
  SAFE_MAX: 140,
  DECAY_PER_SECOND: 2, // total drains by this per second
  SPAWN_INTERVAL: 1200, // starting ms between spawns
  MIN_SPAWN_INTERVAL: 500, // fastest spawn rate
  NUMBER_MIN: 3,
  NUMBER_MAX: 25,
  POISON_CHANCE: 0.2, // 20% of numbers are poison
} as const;

/** Colère: precision clicking on moving targets with decoys */
export const COLERE = {
  REQUIRED_STREAK: 8,
  BASE_HIT_WINDOW: 1000,
  MIN_HIT_WINDOW: 150,
  WINDOW_TIGHTEN_STEP: 25,
  TARGET_INTERVAL_MIN: 1200,
  TARGET_INTERVAL_MAX: 2500,
  MAX_MISSES: 5,
} as const;

/** Paresse: 6x6 Latin square with cursed cells, time distortion, input delay */
export const PARESSE = {
  GRID_SIZE: 6,
  BASE_TIME: 180,
  DISTORTION_MIN: 0.5,
  DISTORTION_MAX: 3.0,
  CURSE_INTERVAL: 20, // seconds between curse activations
  CURSE_DURATION: 3, // seconds curse lasts
  INPUT_DELAY: 400, // ms delay after placing a number
} as const;

/** The final code formed by concatenating fragments in sin order */
export const FINAL_CODE = '37641951824523';
/** Envie's fragment is reversed: 51 -> 15 in the final code */
export const FINAL_CODE_DISPLAY = '3764 1519 8245 23';

/** Max attempts before showing a hint on the final page */
export const MAX_JUDGMENT_ATTEMPTS = 3;
