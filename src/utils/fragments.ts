import { TRIALS } from '@/src/data/trials';

/**
 * Build the final code from collected fragments.
 * Envie's fragment (index 3) must be reversed.
 */
export function buildFinalCode(fragments: (number | null)[]): string | null {
  if (fragments.some((f) => f === null)) return null;

  return fragments
    .map((frag, i) => {
      const trial = TRIALS[i];
      const str = String(frag).padStart(2, '0');
      return trial.reversed ? str.split('').reverse().join('') : str;
    })
    .join('');
}

/**
 * Validate entered code against the expected final code.
 */
export function validateFinalCode(
  entered: string,
  fragments: (number | null)[]
): boolean {
  const expected = buildFinalCode(fragments);
  if (!expected) return false;
  // Strip spaces for comparison
  const clean = entered.replace(/\s/g, '');
  return clean === expected;
}

/**
 * Format fragment for display (2-digit, zero-padded).
 */
export function formatFragment(frag: number | null): string {
  if (frag === null) return '??';
  return String(frag).padStart(2, '0');
}
