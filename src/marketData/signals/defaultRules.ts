import { overboughtBearishRule } from "./rules/overboughtBearish.js";
import { reversalBullishRule } from "./rules/reversalBullish.js";
import type { SignalRule } from "./types.js";

/** Order matters when multiple rules could match (not the case for current RSI thresholds). */
export const defaultSignalRules: readonly SignalRule[] = [
  overboughtBearishRule,
  reversalBullishRule,
];
