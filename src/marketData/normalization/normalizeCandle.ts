import type { NormalizedCandle } from "../types.js";
import type { CandleNormalizer, MarketDataProviderId, NormalizeCandleOptions } from "./types.js";
import { createBinanceKlineNormalizer, looksLikeBinanceKlineEvent } from "./adapters/binance.js";

const registry = new Map<string, CandleNormalizer>();

export function registerCandleNormalizer(provider: MarketDataProviderId, normalizer: CandleNormalizer): void {
  registry.set(String(provider), normalizer);
}

function getNormalizer(provider: MarketDataProviderId, options: NormalizeCandleOptions): CandleNormalizer | null {
  const key = String(provider);
  const override = registry.get(key);
  if (override) return override;

  if (key === "binance") {
    return createBinanceKlineNormalizer({ interval: options.interval ?? "1m" });
  }

  return null;
}

function detectProvider(raw: unknown): MarketDataProviderId | null {
  if (looksLikeBinanceKlineEvent(raw)) return "binance";
  return null;
}

function coerceUnknownJson(raw: unknown): unknown {
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as unknown;
    } catch {
      return raw;
    }
  }
  return raw;
}

/**
 * Pure transformation entrypoint: accepts provider-specific raw payloads (object or JSON string)
 * and returns a strict internal candle schema, or null when the event should be skipped.
 */
export function normalizeCandle(raw: unknown, options: NormalizeCandleOptions = {}): NormalizedCandle | null {
  const decoded = coerceUnknownJson(raw);

  const provider = options.provider ?? detectProvider(decoded);
  if (!provider) {
    options.logger?.({ level: "debug", message: "normalizeCandle: unknown provider/shape; skipped" });
    return null;
  }

  const fn = getNormalizer(provider, options);
  if (!fn) {
    options.logger?.({ level: "warn", message: "normalizeCandle: no normalizer registered", meta: { provider } });
    return null;
  }

  const candle = fn(decoded);
  if (!candle) {
    options.logger?.({ level: "debug", message: "normalizeCandle: adapter returned null; skipped", meta: { provider } });
    return null;
  }

  // Apply hints without inventing market facts: only fill missing symbol.
  if (options.symbolHint && !candle.symbol) {
    candle.symbol = options.symbolHint.trim().toUpperCase();
  }

  // Final invariants
  if (!candle.symbol) {
    options.logger?.({ level: "debug", message: "normalizeCandle: missing symbol after normalization; skipped" });
    return null;
  }

  candle.symbol = candle.symbol.toUpperCase();

  return candle;
}

/**
 * Streaming helper: maps an async iterable of raw frames/strings/objects into normalized candles.
 * Invalid frames are skipped (nulls filtered out).
 */
export async function* normalizeCandleStream(
  rawEvents: AsyncIterable<unknown>,
  options: NormalizeCandleOptions = {}
): AsyncGenerator<NormalizedCandle, void, void> {
  for await (const raw of rawEvents) {
    const candle = normalizeCandle(raw, options);
    if (candle) yield candle;
  }
}
