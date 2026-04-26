import type { Candle } from "../../candleBuffer.js";
import type { FinnhubTrade } from "./types.js";

export interface TradeCandleAggregatorOptions {
  /** Candle size in ms. Default: 15 minutes. */
  intervalMs?: number;
  /** Called when a candle is closed (completed interval). */
  onCandleClose?: (symbol: string, candle: Candle) => void;
  /** Called when current candle is updated (in-progress). */
  onCandleUpdate?: (symbol: string, candle: Candle) => void;
}

type MutableCandle = Candle & { volume: number };

function bucketStartMs(tsMs: number, intervalMs: number): number {
  return Math.floor(tsMs / intervalMs) * intervalMs;
}

export class TradeCandleAggregator {
  private readonly intervalMs: number;
  private readonly onCandleClose?: TradeCandleAggregatorOptions["onCandleClose"];
  private readonly onCandleUpdate?: TradeCandleAggregatorOptions["onCandleUpdate"];
  private readonly current = new Map<string, { bucket: number; candle: MutableCandle }>();

  constructor(opts: TradeCandleAggregatorOptions = {}) {
    this.intervalMs = opts.intervalMs ?? 15 * 60 * 1000;
    this.onCandleClose = opts.onCandleClose;
    this.onCandleUpdate = opts.onCandleUpdate;
  }

  ingestTrade(tr: FinnhubTrade): void {
    const symbol = String(tr.s ?? "").trim().toUpperCase();
    const price = Number(tr.p);
    const ts = Number(tr.t);
    const vol = Number(tr.v ?? 0);
    if (!symbol || !Number.isFinite(price) || !Number.isFinite(ts)) return;

    const bucket = bucketStartMs(ts, this.intervalMs);
    const prev = this.current.get(symbol);
    if (!prev || prev.bucket !== bucket) {
      if (prev) {
        this.onCandleClose?.(symbol, { ...prev.candle });
      }
      const c: MutableCandle = {
        time: bucket,
        open: price,
        high: price,
        low: price,
        close: price,
        volume: Number.isFinite(vol) ? vol : 0
      };
      this.current.set(symbol, { bucket, candle: c });
      this.onCandleUpdate?.(symbol, { ...c });
      return;
    }

    const c = prev.candle;
    c.high = Math.max(c.high, price);
    c.low = Math.min(c.low, price);
    c.close = price;
    if (Number.isFinite(vol)) {
      c.volume += vol;
    }
    this.onCandleUpdate?.(symbol, { ...c });
  }

  /** For tests/debugging. */
  getCurrentCandle(symbol: string): Candle | null {
    const s = symbol.trim().toUpperCase();
    const c = this.current.get(s)?.candle;
    return c ? { ...c } : null;
  }
}

