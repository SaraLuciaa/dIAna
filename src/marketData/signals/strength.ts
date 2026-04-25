/** Shared scoring slots so multi-condition rules map to the 0–1 range as in the product brief (e.g. 2/3 ≈ 0.66). */
export const DEFAULT_STRENGTH_SLOTS = 3;

export function strengthFromSatisfied(
  satisfiedParts: number,
  slots: number = DEFAULT_STRENGTH_SLOTS,
): number {
  if (slots <= 0) return 0;
  return Math.min(1, satisfiedParts / slots);
}
