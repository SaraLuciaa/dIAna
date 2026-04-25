import type { NormalizedCandle } from "../types.js";

export type IndicatorSnapshot = {
  rsi: number;
  macd: {
    value: number;
    signal: number;
    histogram: number;
  };
};

export type IndicatorEngineOptions = {
  rsiPeriod?: number;
  macdFast?: number;
  macdSlow?: number;
  macdSignal?: number;
  /** Max closed candles kept for preview / debugging (does not affect incremental math). */
  maxClosedHistory?: number;
};

export type { NormalizedCandle };
