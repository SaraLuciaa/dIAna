import WebSocket from "ws";
import { CandleBuffer, type Candle } from "./candleBuffer.js";

export interface MarketDataServiceOptions {
  url: string;
  /** Cantidad de velas a mantener por símbolo. */
  bufferSize?: number;
}

/**
 * Servicio WebSocket (skeleton): recibe mensajes y permite alimentar buffers por símbolo.
 * La normalización concreta (Finnhub/Binance) se implementa en `websocket/` luego.
 */
export class MarketDataService {
  private readonly url: string;
  private readonly bufferSize: number;
  private ws: WebSocket | null = null;
  private readonly buffers = new Map<string, CandleBuffer>();

  constructor(opts: MarketDataServiceOptions) {
    this.url = opts.url;
    this.bufferSize = opts.bufferSize ?? 300;
  }

  getBuffer(symbol: string): CandleBuffer {
    const key = symbol.toUpperCase();
    let b = this.buffers.get(key);
    if (!b) {
      b = new CandleBuffer(this.bufferSize);
      this.buffers.set(key, b);
    }
    return b;
  }

  connect(onRawMessage?: (data: WebSocket.RawData) => void): void {
    if (this.ws) return;
    const ws = new WebSocket(this.url);
    this.ws = ws;

    ws.on("message", (data) => {
      onRawMessage?.(data);
    });
    ws.on("close", () => {
      this.ws = null;
    });
    ws.on("error", () => {
      // la reconexión se agrega en iteraciones posteriores
    });
  }

  disconnect(): void {
    this.ws?.close();
    this.ws = null;
  }

  /** Helper para desarrollo: inserta una vela ya normalizada en el buffer. */
  ingestCandle(symbol: string, candle: Candle): void {
    this.getBuffer(symbol).push(candle);
  }
}

