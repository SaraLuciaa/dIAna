import WebSocket from "ws";
import type { BinanceKlineStreamFrame } from "./types.js";

export interface BinanceWsClientOptions {
  /** default: `wss://stream.binance.com:9443` */
  baseUrl?: string;
  onMessage?: (frame: unknown) => void;
  onError?: (err: Error) => void;
  onStatus?: (s: { kind: "connected" | "disconnected" | "reconnecting"; attempt?: number }) => void;
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function jitter(ms: number): number {
  const r = 0.2;
  const delta = ms * r * (Math.random() * 2 - 1);
  return Math.max(0, Math.floor(ms + delta));
}

function backoffMs(attempt: number): number {
  const steps = [1000, 2000, 5000, 10000, 30000];
  const idx = Math.min(steps.length - 1, Math.max(0, attempt - 1));
  return jitter(steps[idx] ?? 30000);
}

type Sub = { symbol: string; interval: string };

export class BinanceWsClient {
  private readonly baseUrl: string;
  private readonly onMessage?: (frame: unknown) => void;
  private readonly onError?: (err: Error) => void;
  private readonly onStatus?: BinanceWsClientOptions["onStatus"];

  private ws: WebSocket | null = null;
  private closing = false;
  private reconnectAttempt = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private readonly subs = new Map<string, Sub>(); // key = stream name

  constructor(opts: BinanceWsClientOptions = {}) {
    this.baseUrl = (opts.baseUrl ?? "wss://stream.binance.com:9443").replace(/\/+$/, "");
    this.onMessage = opts.onMessage;
    this.onError = opts.onError;
    this.onStatus = opts.onStatus;
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  connect(): void {
    if (this.ws || this.reconnectTimer) return;
    this.closing = false;

    const ws = new WebSocket(`${this.baseUrl}/ws`);
    this.ws = ws;

    ws.on("open", () => {
      this.reconnectAttempt = 0;
      this.onStatus?.({ kind: "connected" });
      // resubscribe
      if (this.subs.size > 0) {
        this.send({
          method: "SUBSCRIBE",
          params: [...this.subs.keys()],
          id: Date.now()
        });
      }
    });

    ws.on("message", (data) => {
      const text = typeof data === "string" ? data : data.toString("utf8");
      const parsed = safeJsonParse(text);
      if (parsed === null) return;
      // Binance sends subscription acks too; we just pass them through
      this.onMessage?.(parsed as BinanceKlineStreamFrame | unknown);
    });

    ws.on("close", () => {
      this.ws = null;
      if (this.closing) {
        this.onStatus?.({ kind: "disconnected" });
        return;
      }
      this.scheduleReconnect();
    });

    ws.on("error", (e) => {
      this.onError?.(e instanceof Error ? e : new Error(String(e)));
    });
  }

  disconnect(): void {
    this.closing = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    const ws = this.ws;
    this.ws = null;
    try {
      ws?.close();
    } catch {
      // ignore
    }
    this.onStatus?.({ kind: "disconnected" });
  }

  subscribeKlines(symbol: string, interval: string): void {
    const s = symbol.trim().toLowerCase();
    const i = interval.trim();
    if (!s || !i) return;
    const stream = `${s}@kline_${i}`;
    this.subs.set(stream, { symbol: s.toUpperCase(), interval: i });
    if (this.isConnected()) {
      this.send({ method: "SUBSCRIBE", params: [stream], id: Date.now() });
    }
  }

  unsubscribeKlines(symbol: string, interval: string): void {
    const s = symbol.trim().toLowerCase();
    const i = interval.trim();
    const stream = `${s}@kline_${i}`;
    this.subs.delete(stream);
    if (this.isConnected()) {
      this.send({ method: "UNSUBSCRIBE", params: [stream], id: Date.now() });
    }
  }

  private send(msg: unknown): void {
    try {
      this.ws?.send(JSON.stringify(msg));
    } catch (e) {
      this.onError?.(e instanceof Error ? e : new Error(String(e)));
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer || this.closing) return;
    this.reconnectAttempt += 1;
    const delay = backoffMs(this.reconnectAttempt);
    this.onStatus?.({ kind: "reconnecting", attempt: this.reconnectAttempt });
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }
}

