import WebSocket from "ws";
import type { FinnhubSubscribeMessage, FinnhubTrade, FinnhubWsFrame } from "./types.js";

export interface FinnhubWsClientOptions {
  apiKey: string;
  /** default: `wss://ws.finnhub.io` */
  baseUrl?: string;
  /** Called when a trade arrives (already parsed). */
  onTrade?: (trade: FinnhubTrade) => void;
  /** Called on non-fatal errors (parse errors, ws errors, etc.). */
  onError?: (err: Error) => void;
  /** Called on connection state changes. */
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
  const r = 0.2; // ±20%
  const delta = ms * r * (Math.random() * 2 - 1);
  return Math.max(0, Math.floor(ms + delta));
}

function backoffMs(attempt: number): number {
  // 1s, 2s, 5s, 10s, 30s (cap)
  const steps = [1000, 2000, 5000, 10000, 30000];
  const idx = Math.min(steps.length - 1, Math.max(0, attempt - 1));
  return jitter(steps[idx] ?? 30000);
}

export class FinnhubWsClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly onTrade?: (trade: FinnhubTrade) => void;
  private readonly onError?: (err: Error) => void;
  private readonly onStatus?: FinnhubWsClientOptions["onStatus"];

  private ws: WebSocket | null = null;
  private reconnectAttempt = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private readonly subs = new Set<string>();
  private closing = false;

  constructor(opts: FinnhubWsClientOptions) {
    this.apiKey = opts.apiKey;
    this.baseUrl = (opts.baseUrl ?? "wss://ws.finnhub.io").replace(/\/+$/, "");
    this.onTrade = opts.onTrade;
    this.onError = opts.onError;
    this.onStatus = opts.onStatus;
  }

  private url(): string {
    return `${this.baseUrl}?token=${encodeURIComponent(this.apiKey)}`;
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  connect(): void {
    if (this.ws || this.reconnectTimer) return;
    this.closing = false;

    const ws = new WebSocket(this.url());
    this.ws = ws;

    ws.on("open", () => {
      this.reconnectAttempt = 0;
      this.onStatus?.({ kind: "connected" });
      // re-subscribe
      for (const s of this.subs) {
        this.send({ type: "subscribe", symbol: s });
      }
    });

    ws.on("message", (data) => {
      const text = typeof data === "string" ? data : data.toString("utf8");
      const parsed = safeJsonParse(text);
      if (!parsed || typeof parsed !== "object") return;
      const frame = parsed as FinnhubWsFrame;

      if (frame.type === "trade") {
        const trades = Array.isArray((frame as any).data) ? ((frame as any).data as FinnhubTrade[]) : [];
        for (const tr of trades) {
          if (!tr || typeof tr !== "object") continue;
          this.onTrade?.(tr);
        }
        return;
      }

      if (frame.type === "error") {
        const msg = String((frame as any).msg ?? (frame as any).message ?? "Finnhub websocket error");
        this.onError?.(new Error(msg));
      }
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
      // let close handler schedule reconnect if needed
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

  subscribe(symbol: string): void {
    const s = symbol.trim().toUpperCase();
    if (!s) return;
    this.subs.add(s);
    if (this.isConnected()) {
      this.send({ type: "subscribe", symbol: s });
    }
  }

  unsubscribe(symbol: string): void {
    const s = symbol.trim().toUpperCase();
    if (!s) return;
    this.subs.delete(s);
    if (this.isConnected()) {
      this.send({ type: "unsubscribe", symbol: s });
    }
  }

  private send(msg: FinnhubSubscribeMessage): void {
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

