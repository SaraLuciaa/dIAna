import { macdLast, rsiWilderLast } from "./batch.js";
import { MacdIncremental, RsiIncremental } from "./incremental.js";
import type {
  IndicatorEngineOptions,
  IndicatorSnapshot,
  NormalizedCandle,
} from "./types.js";

function isFiniteNumber(n: number): boolean {
  return Number.isFinite(n);
}

function validateCandle(c: NormalizedCandle): boolean {
  return (
    isFiniteNumber(c.open) &&
    isFiniteNumber(c.high) &&
    isFiniteNumber(c.low) &&
    isFiniteNumber(c.close) &&
    isFiniteNumber(c.volume) &&
    isFiniteNumber(c.timestamp)
  );
}

/**
 * Window-based technical indicators on normalized OHLCV.
 * - Closed candles (`is_closed: true`) advance incremental state (O(1) per bar).
 * - Open candles (`is_closed: false`) return a non-mutating preview from recent closes + current close.
 */
export class IndicatorEngine {
  private readonly rsiPeriod: number;
  private readonly macdFast: number;
  private readonly macdSlow: number;
  private readonly macdSignal: number;
  private readonly maxClosedHistory: number;
  private rsi: RsiIncremental;
  private macd: MacdIncremental;
  private closed: NormalizedCandle[] = [];

  constructor(options: IndicatorEngineOptions = {}) {
    this.rsiPeriod = options.rsiPeriod ?? 14;
    this.macdFast = options.macdFast ?? 12;
    this.macdSlow = options.macdSlow ?? 26;
    this.macdSignal = options.macdSignal ?? 9;
    this.maxClosedHistory = options.maxClosedHistory ?? 5000;
    this.rsi = new RsiIncremental(this.rsiPeriod);
    this.macd = new MacdIncremental(
      this.macdFast,
      this.macdSlow,
      this.macdSignal,
    );
  }

  /** Replace last closed candle if same `timestamp` (corrections), else append. */
  private pushClosed(candle: NormalizedCandle): void {
    const last = this.closed[this.closed.length - 1];
    if (last && last.timestamp === candle.timestamp) {
      this.closed[this.closed.length - 1] = candle;
      this.rebuildIncrementalFromCloses();
      return;
    }
    this.closed.push(candle);
    if (this.closed.length > this.maxClosedHistory) {
      this.closed = this.closed.slice(-this.maxClosedHistory);
      this.rebuildIncrementalFromCloses();
      return;
    }
    this.rsi.step(candle.close);
    this.macd.step(candle.close);
  }

  private rebuildIncrementalFromCloses(): void {
    const rsi = new RsiIncremental(this.rsiPeriod);
    const macd = new MacdIncremental(
      this.macdFast,
      this.macdSlow,
      this.macdSignal,
    );
    for (const c of this.closed) {
      rsi.step(c.close);
      macd.step(c.close);
    }
    this.rsi = rsi;
    this.macd = macd;
  }

  private closesForPreview(last: NormalizedCandle): number[] {
    const base =
      this.closed.length > 0 ? this.closed.map((c) => c.close) : [];
    const replaceLast =
      last.timestamp === this.closed[this.closed.length - 1]?.timestamp;
    if (replaceLast && base.length > 0) base[base.length - 1] = last.close;
    else base.push(last.close);
    return base;
  }

  private snapshotFromCloses(closes: readonly number[]): IndicatorSnapshot | null {
    const rsi = rsiWilderLast(closes, this.rsiPeriod);
    const macd = macdLast(
      closes,
      this.macdFast,
      this.macdSlow,
      this.macdSignal,
    );
    if (rsi === null || macd === null) return null;
    return {
      rsi,
      macd: {
        value: macd.value,
        signal: macd.signal,
        histogram: macd.histogram,
      },
    };
  }

  private snapshotIncremental(): IndicatorSnapshot | null {
    const rsi = this.rsi.value();
    const macd = this.macd.snapshot();
    if (rsi === null || macd === null) return null;
    return { rsi, macd };
  }

  /**
   * Feed one candle. Closed candles update state; open candles compute preview only.
   * Returns `null` until both RSI and MACD (incl. signal) are defined — never NaN/undefined fields.
   */
  update(candle: NormalizedCandle): IndicatorSnapshot | null {
    if (!validateCandle(candle)) return null;
    if (!candle.is_closed) {
      if (this.closed.length === 0) return null;
      return this.snapshotFromCloses(this.closesForPreview(candle));
    }
    this.pushClosed(candle);
    return this.snapshotIncremental();
  }

  /**
   * One-shot compute from an arbitrary window (e.g. backtests). Does not mutate engine state.
   */
  computeWindow(candles: readonly NormalizedCandle[]): IndicatorSnapshot | null {
    const closes: number[] = [];
    for (const c of candles) {
      if (!validateCandle(c)) continue;
      closes.push(c.close);
    }
    return this.snapshotFromCloses(closes);
  }
}
