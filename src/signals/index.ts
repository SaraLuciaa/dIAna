export { detect } from "./detect.js";
export {
  DEFAULT_STRENGTH_SLOTS,
  strengthFromSatisfied,
} from "./strength.js";
export { defaultSignalRules } from "./defaultRules.js";
export { reversalBullishRule } from "./rules/reversalBullish.js";
export { overboughtBearishRule } from "./rules/overboughtBearish.js";
export {
  macdBullishCross,
  histogramTurnsPositive,
  macdBullishTrigger,
} from "./rules/macdTriggers.js";
export type {
  IndicatorSnapshot,
  MacdSnapshot,
  RuleEvaluation,
  SignalDetectorInput,
  SignalRule,
  SignalType,
  TradingSignal,
} from "./types.js";
