import type { NormalizedCandle } from "../../types.js";
import type { CandleNormalizer } from "../types.js";

type BinanceKlinePayload = {
  e?: string;
  s?: string;
  k?: {
    t?: number; // start time (ms)
    s?: string; // symbol
    i?: string; // interval
    o?: unknown;
    c?: unknown;
    h?: unknown;
    l?: unknown;
    v?: unknown;
    x?: boolean; // is this kline closed?
    // extra fields are ignored
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

export function looksLikeBinanceKlineEvent(raw: unknown): raw is BinanceKlinePayload {
  if (!raw || typeof raw !== "object") return false;
  const msg = raw as BinanceKlinePayload;
  return msg.e === "kline" && !!msg.k && typeof msg.k === "object";
}

export function createBinanceKlineNormalizer(opts: { interval?: string } = {}): CandleNormalizer {
  const interval = opts.interval ?? "1m";

  return (raw: unknown): NormalizedCandle | null => {
    if (!looksLikeBinanceKlineEvent(raw)) return null;
    const msg = raw;

    const k = msg.k;
    if (!k) return null;
    if (k.i !== interval) return null;

    const symbol = String(k.s ?? msg.s ?? "")
      .trim()
      .toUpperCase();
    if (!symbol) return null;

    const tMs = typeof k.t === "number" ? k.t : Number.NaN;
    if (!Number.isFinite(tMs)) return null;

    const open = safeNumber(k.o);
    const high = safeNumber(k.h);
    const low = safeNumber(k.l);
    const close = safeNumber(k.c);
    const volume = safeNumber(k.v);
    if (open === null || high === null || low === null || close === null || volume === null) {
      return null;
    }

    return {
      symbol,
      timestamp: Math.floor(tMs / 1000),
      open,
      high,
      low,
      close,
      volume,
      is_closed: k.x === true
    };
  };
}

export const normalizeBinanceKlineEvent: CandleNormalizer = createBinanceKlineNormalizer({ interval: "1m" });

function safeNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v !== "string") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
