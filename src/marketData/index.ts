export { BinanceKlineStream } from "./binanceKlineStream.js";
export type { BinanceKlineStreamOptions, CandleHandler } from "./binanceKlineStream.js";
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

