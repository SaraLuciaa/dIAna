import { BinanceKlineStream } from "./binanceKlineStream.js";
import type { NormalizedCandle } from "./types.js";

type HubEntry = {
  symbol: string;
  stream: BinanceKlineStream;
  buffer: NormalizedCandle[];
  max: number;
  off: () => void;
};

/**
 * MVP hub to reuse a single WS subscription per symbol and keep a small in-memory ring buffer.
 * Intended for LangChain tools / lightweight consumers (not a full message bus).
 */
export class BinanceKlineHub {
  private readonly subs = new Map<string, HubEntry>();

  list(): string[] {
    return [...this.subs.keys()].sort();
  }

  isSubscribed(symbol: string): boolean {
    const sym = symbol.trim().toUpperCase();
    return this.subs.has(sym);
  }

  async subscribe(symbol: string, opts: { max?: number } = {}): Promise<{ symbol: string; started: boolean }> {
    const sym = symbol.trim().toUpperCase();
    if (!sym) throw new Error("symbol inválido");

    const max = opts.max ?? 200;
    const existing = this.subs.get(sym);
    if (existing) {
      existing.max = Math.max(existing.max, max);
      return { symbol: sym, started: false };
    }

    const buffer: NormalizedCandle[] = [];
    const stream = new BinanceKlineStream({ symbol: sym });
    const off = stream.onCandle((c) => {
      buffer.push(c);
      const cap = this.subs.get(sym)?.max ?? max;
      if (buffer.length > cap) buffer.splice(0, buffer.length - cap);
    });

    this.subs.set(sym, { symbol: sym, stream, buffer, max, off });
    await stream.start();
    return { symbol: sym, started: true };
  }

  async unsubscribe(symbol: string): Promise<{ symbol: string; stopped: boolean }> {
    const sym = symbol.trim().toUpperCase();
    const entry = this.subs.get(sym);
    if (!entry) return { symbol: sym, stopped: false };
    entry.off();
    await entry.stream.stop();
    this.subs.delete(sym);
    return { symbol: sym, stopped: true };
  }

  recent(symbol: string, limit: number): NormalizedCandle[] {
    const sym = symbol.trim().toUpperCase();
    const entry = this.subs.get(sym);
    if (!entry) return [];
    const n = Math.max(0, Math.min(limit, entry.buffer.length));
    return entry.buffer.slice(-n);
  }

  /**
   * Waits until `count` matching candles arrive, or until timeout.
   * This is intentionally "tool-friendly": a single agent step can observe streaming briefly.
   */
  async waitForCandles(
    symbol: string,
    opts: {
      count: number;
      timeoutMs: number;
      onlyClosed?: boolean;
      pollMs?: number;
    }
  ): Promise<{ symbol: string; received: number; timedOut: boolean; candles: NormalizedCandle[] }> {
    const sym = symbol.trim().toUpperCase();
    const entry = this.subs.get(sym);
    if (!entry) {
      return { symbol: sym, received: 0, timedOut: true, candles: [] };
    }

    const want = Math.max(1, Math.min(opts.count, 500));
    const timeoutMs = Math.max(50, Math.min(opts.timeoutMs, 120_000));
    const pollMs = Math.max(25, Math.min(opts.pollMs ?? 200, 2000));
    const onlyClosed = opts.onlyClosed !== false;

    const startLen = entry.buffer.length;
    const deadline = Date.now() + timeoutMs;
    const out: NormalizedCandle[] = [];

    const matches = (c: NormalizedCandle): boolean => {
      if (onlyClosed) return c.is_closed === true;
      return true;
    };

    // Fast path: scan existing buffer tail for matches (covers "already arrived" cases).
    const scanFrom = Math.max(0, startLen - Math.min(entry.buffer.length, entry.max));
    for (let i = scanFrom; i < entry.buffer.length; i++) {
      const c = entry.buffer[i]!;
      if (!matches(c)) continue;
      out.push(c);
      if (out.length >= want) {
        return { symbol: sym, received: out.length, timedOut: false, candles: out.slice(-want) };
      }
    }

    while (Date.now() < deadline) {
      const prevLen = entry.buffer.length;
      // Wait until buffer grows or timeout.
      while (Date.now() < deadline && entry.buffer.length === prevLen) {
        await sleep(pollMs);
      }
      if (entry.buffer.length === prevLen) break;

      for (let i = prevLen; i < entry.buffer.length; i++) {
        const c = entry.buffer[i]!;
        if (!matches(c)) continue;
        out.push(c);
        if (out.length >= want) {
          return { symbol: sym, received: out.length, timedOut: false, candles: out.slice(-want) };
        }
      }
    }

    return { symbol: sym, received: out.length, timedOut: true, candles: out.slice(-want) };
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
