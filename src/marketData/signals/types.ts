import type { IndicatorSnapshot } from "../indicators/types.js";

export type { IndicatorSnapshot };

export type MacdSnapshot = IndicatorSnapshot["macd"];

/** Single-tick input; include `previousMacd` when the stream has a prior MACD sample. */
export type SignalDetectorInput = {
  symbol?: string;
  timestamp?: number;
  indicators: IndicatorSnapshot;
  /** Prior MACD (e.g. previous closed bar or previous tick) for crossover / histogram flip. */
  previousMacd?: MacdSnapshot;
};

export type SignalType = "reversal" | "overbought";

export type TradingSignal = {
  symbol: string;
  timestamp: number;
  type: SignalType;
  /** 0–1: satisfied parts / default scoring slots (3 in MVP, see `strengthFromSatisfied`). */
  strength: number;
  conditions: string[];
};

/** Returned when a rule fully matches (partial matches return `null` from `evaluate`). */
export type RuleEvaluation = {
  strength: number;
  conditions: string[];
};

export type SignalRule = {
  readonly type: SignalType;
  /** Human-readable id for logs/tests. */
  readonly id: string;
  evaluate(input: SignalDetectorInput): RuleEvaluation | null;
};
