import WebSocket, { type RawData } from "ws";
import { AsyncQueue } from "./asyncQueue.js";
import type { NormalizedCandle } from "./types.js";

type BinanceKlineMessage = {
  e?: string;
  s?: string;
  k?: {
    t?: number; // start time (ms)
    s?: string; // symbol
    i?: string; // interval
    o?: string;
    c?: string;
    h?: string;
    l?: string;
    v?: string;
    x?: boolean; // is this kline closed?
  };
};

export type BinanceKlineStreamOptions = {
  /** e.g. BTCUSDT */
  symbol: string;
  /** default: 1m */
  interval?: "1m";
  /**
   * When true, pushes also to internal queue (async generator consumers).
   * default: true
   */
  enableQueue?: boolean;
  /**
   * Reconnect backoff (ms). default: { min: 250, max: 10_000 }
   */
  reconnectBackoffMs?: { min: number; max: number };
  /** Optional logger hook. */
  logger?: (event: { level: "debug" | "info" | "warn" | "error"; message: string; meta?: unknown }) => void;
  /** Binance WS base URL. default: wss://stream.binance.com:9443 */
  baseUrl?: string;
};

export type CandleHandler = (candle: NormalizedCandle) => void | Promise<void>;

export class BinanceKlineStream {
  private readonly interval: "1m";
  private readonly baseUrl: string;
  private readonly backoffMin: number;
  private readonly backoffMax: number;
  private readonly enableQueue: boolean;
  private readonly logger?: BinanceKlineStreamOptions["logger"];

  private symbol: string;
  private ws: WebSocket | null = null;
  private running = false;
  private reconnectAttempt = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;

  private readonly queue = new AsyncQueue<NormalizedCandle>();
  private readonly subscribers = new Set<CandleHandler>();

  constructor(options: BinanceKlineStreamOptions) {
    this.symbol = options.symbol.trim().toUpperCase();
    this.interval = options.interval ?? "1m";
    this.baseUrl = options.baseUrl ?? "wss://stream.binance.com:9443";
    this.enableQueue = options.enableQueue ?? true;
    this.backoffMin = options.reconnectBackoffMs?.min ?? 250;
    this.backoffMax = options.reconnectBackoffMs?.max ?? 10_000;
    this.logger = options.logger;
  }

  /**
   * Update the symbol for next (re)connect. If currently running, it reconnects immediately.
   */
  setSymbol(symbol: string): void {
    const next = symbol.trim().toUpperCase();
    if (!next) return;
    if (next === this.symbol) return;
    this.symbol = next;
    if (this.running) {
      this.log("info", "symbol updated; reconnecting", { symbol: this.symbol });
      void this.reconnectSoon(0);
    }
  }

  /**
   * Subscribe with a callback consumer. Returns an unsubscribe function.
   */
  onCandle(handler: CandleHandler): () => void {
    this.subscribers.add(handler);
    return () => {
      this.subscribers.delete(handler);
    };
  }

  /**
   * Async iterator consumer (in-memory queue). Only emits if `enableQueue` is true.
   */
  stream(): AsyncIterable<NormalizedCandle> {
    return this.queue;
  }

  async start(): Promise<void> {
    if (this.running) return;
    this.running = true;
    this.reconnectAttempt = 0;
    await this.connect();
  }

  async stop(): Promise<void> {
    this.running = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    await this.closeSocket("stopped");
    this.queue.close();
  }

  private wsUrl(): string {
    const streamName = `${this.symbol.toLowerCase()}@kline_${this.interval}`;
    return `${this.baseUrl}/ws/${streamName}`;
  }

  private async connect(): Promise<void> {
    if (!this.running) return;
    if (this.ws) return;

    const url = this.wsUrl();
    this.log("info", "connecting", { url });

    const ws = new WebSocket(url);
    this.ws = ws;

    ws.on("open", () => {
      this.reconnectAttempt = 0;
      this.log("info", "connected", { symbol: this.symbol, interval: this.interval });
    });

    ws.on("message", (data: RawData) => {
      try {
        const text = typeof data === "string" ? data : data.toString("utf8");
        const parsed = JSON.parse(text) as BinanceKlineMessage;
        const candle = normalizeBinanceKline(parsed);
        if (!candle) return;

        // Ensure symbol stays normalized to current stream context.
        candle.symbol = candle.symbol.toUpperCase();

        if (this.enableQueue) this.queue.push(candle);
        if (this.subscribers.size > 0) {
          for (const handler of this.subscribers) {
            Promise.resolve(handler(candle)).catch((e) => {
              this.log("warn", "subscriber handler error", { error: toErrorString(e) });
            });
          }
        }
      } catch (e) {
        // Malformed payloads should never crash the stream.
        this.log("warn", "malformed message ignored", { error: toErrorString(e) });
      }
    });

    ws.on("error", (err: Error) => {
      this.log("warn", "socket error", { error: toErrorString(err) });
    });

    ws.on("close", (code: number, reason: Buffer) => {
      const r = typeof reason === "string" ? reason : reason.toString("utf8");
      this.log("warn", "disconnected", { code, reason: r });
      this.ws = null;
      if (this.running) {
        void this.reconnectSoon();
      }
    });
  }

  private async reconnectSoon(delayMs?: number): Promise<void> {
    if (!this.running) return;
    if (this.reconnectTimer) return;

    await this.closeSocket("reconnect");

    const delay = delayMs ?? this.nextBackoffMs();
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.connect();
    }, delay);
    this.log("info", "reconnect scheduled", { delayMs: delay, attempt: this.reconnectAttempt });
  }

  private nextBackoffMs(): number {
    this.reconnectAttempt += 1;
    const exp = Math.min(this.backoffMax, this.backoffMin * 2 ** (this.reconnectAttempt - 1));
    const jitter = 0.2 * exp * (Math.random() - 0.5) * 2; // +/-20%
    const ms = Math.max(this.backoffMin, Math.min(this.backoffMax, Math.round(exp + jitter)));
    return ms;
  }

  private async closeSocket(reason: string): Promise<void> {
    const ws = this.ws;
    this.ws = null;
    if (!ws) return;

    try {
      ws.removeAllListeners();
      // terminate is safer for hanging sockets; Binance will reconnect anyway.
      ws.terminate();
      this.log("debug", "socket terminated", { reason });
    } catch (e) {
      this.log("debug", "socket close error ignored", { error: toErrorString(e) });
    }
  }

  private log(level: "debug" | "info" | "warn" | "error", message: string, meta?: unknown): void {
    this.logger?.({ level, message, meta });
  }
}

export function normalizeBinanceKline(msg: BinanceKlineMessage): NormalizedCandle | null {
  if (!msg || msg.e !== "kline") return null;
  const k = msg.k;
  if (!k || k.i !== "1m") return null;

  const symbol = (k.s ?? msg.s ?? "").trim().toUpperCase();
  if (!symbol) return null;

  const tMs = typeof k.t === "number" ? k.t : Number.NaN;
  if (!Number.isFinite(tMs)) return null;

  const open = safeNumber(k.o);
  const high = safeNumber(k.h);
  const low = safeNumber(k.l);
  const close = safeNumber(k.c);
  const volume = safeNumber(k.v);
  if (
    open === null ||
    high === null ||
    low === null ||
    close === null ||
    volume === null
  ) {
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
}

function safeNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v !== "string") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function toErrorString(e: unknown): string {
  if (e instanceof Error) return `${e.name}: ${e.message}`;
  return String(e);
}

