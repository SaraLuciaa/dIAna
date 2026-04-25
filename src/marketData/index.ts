export { BinanceKlineStream } from "./binanceKlineStream.js";
export type { BinanceKlineStreamOptions, RawMarketWsEvent, RawMarketWsHandler } from "./binanceKlineStream.js";
export { BinanceKlineHub } from "./binanceKlineHub.js";
export type { NormalizedCandle } from "./types.js";
export {
  normalizeCandle,
  normalizeCandleStream,
  registerCandleNormalizer,
  createBinanceKlineNormalizer,
  looksLikeBinanceKlineEvent,
  normalizeBinanceKlineEvent
} from "./normalization/index.js";
export type { CandleNormalizer, MarketDataProviderId, NormalizeCandleOptions, NormalizeLogger } from "./normalization/index.js";

/** Indicadores técnicos (OHLCV normalizado → RSI/MACD). Sin WebSocket ni LLM. */
export {
  IndicatorEngine,
  macdLast,
  rsiWilderLast,
} from "./indicators/index.js";
export type {
  IndicatorEngineOptions,
  IndicatorSnapshot,
} from "./indicators/types.js";

/** Detección de señales por reglas (indicadores → señal estructurada). Sin LLM. */
export { detect } from "./signals/detect.js";
export { defaultSignalRules } from "./signals/defaultRules.js";
export {
  macdBullishCross,
  histogramTurnsPositive,
  macdBullishTrigger,
} from "./signals/rules/macdTriggers.js";
export { reversalBullishRule } from "./signals/rules/reversalBullish.js";
export { overboughtBearishRule } from "./signals/rules/overboughtBearish.js";
export {
  DEFAULT_STRENGTH_SLOTS,
  strengthFromSatisfied,
} from "./signals/strength.js";
export type {
  MacdSnapshot,
  SignalDetectorInput,
  SignalRule,
  SignalType,
  TradingSignal,
  RuleEvaluation,
} from "./signals/types.js";
