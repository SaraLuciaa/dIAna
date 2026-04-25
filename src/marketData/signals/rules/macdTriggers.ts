import type { MacdSnapshot } from "../types.js";

export function macdBullishCross(
  curr: MacdSnapshot,
  prev: MacdSnapshot,
): boolean {
  return prev.value <= prev.signal && curr.value > curr.signal;
}

/** Histogram crosses from non-positive to strictly positive. */
export function histogramTurnsPositive(
  curr: MacdSnapshot,
  prev: MacdSnapshot,
): boolean {
  return prev.histogram <= 0 && curr.histogram > 0;
}

export function macdBullishTrigger(
  curr: MacdSnapshot,
  prev: MacdSnapshot | undefined,
): boolean {
  if (!prev) return false;
  return macdBullishCross(curr, prev) || histogramTurnsPositive(curr, prev);
}
