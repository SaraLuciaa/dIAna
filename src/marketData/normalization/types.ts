import type { NormalizedCandle } from "../types.js";

export type MarketDataProviderId = "binance" | string;

export type NormalizeLogger = (event: {
  level: "debug" | "info" | "warn" | "error";
  message: string;
  meta?: unknown;
}) => void;

export type CandleNormalizer = (raw: unknown) => NormalizedCandle | null;

export type NormalizeCandleOptions = {
  /**
   * When set, forces a specific provider adapter.
   * When omitted, the normalizer will try lightweight auto-detection.
   */
  provider?: MarketDataProviderId;
  /** Optional hint if provider payloads omit symbol (rare for Binance kline events). */
  symbolHint?: string;
  /** For providers where interval is encoded in nested payloads (Binance). */
  interval?: string;
  logger?: NormalizeLogger;
};
