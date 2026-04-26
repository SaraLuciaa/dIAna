import WebSocket from "ws";
import { CandleBuffer, type Candle } from "./candleBuffer.js";
import { FinnhubWsClient } from "./websocket/finnhub/client.js";
import { TradeCandleAggregator } from "./websocket/finnhub/tradeToCandle.js";
import { BinanceWsClient } from "./websocket/binance/client.js";
import { parseBinanceKlineToCandle } from "./websocket/binance/parseKline.js";

export interface MarketDataServiceOptions {
  /**
   * URL WS genérica (legacy). Para Finnhub preferir `provider: "finnhub"` y `apiKey`.
   */
  url?: string;
  /** Cantidad de velas a mantener por símbolo. */
  bufferSize?: number;
  /** Proveedor (MVP: Finnhub). */
  provider?: "finnhub" | "binance";
  /** API key de Finnhub (requerida si provider=finnhub). */
  apiKey?: string;
  /** Base URL WS de Finnhub (default: wss://ws.finnhub.io). */
  finnhubBaseUrl?: string;
  /** Timeframe de vela en ms (default: 15m). */
  candleIntervalMs?: number;

  /** Base URL WS de Binance (default: wss://stream.binance.com:9443). */
  binanceBaseUrl?: string;
  /** Intervalo de kline Binance (default: 15m). Ej: 1m,5m,15m,1h */
  binanceKlineInterval?: string;
}

/**
 * Servicio WebSocket (skeleton): recibe mensajes y permite alimentar buffers por símbolo.
 * La normalización concreta (Finnhub/Binance) se implementa en `websocket/` luego.
 */
export class MarketDataService {
  private readonly url: string | null;
  private readonly bufferSize: number;
  private ws: WebSocket | null = null;
  private readonly buffers = new Map<string, CandleBuffer>();
  private finnhub: FinnhubWsClient | null = null;
  private aggregator: TradeCandleAggregator | null = null;
  private binance: BinanceWsClient | null = null;
  private binanceInterval: string = "15m";

  constructor(opts: MarketDataServiceOptions) {
    this.url = opts.url ? String(opts.url) : null;
    this.bufferSize = opts.bufferSize ?? 300;

    if (opts.provider === "finnhub") {
      if (!opts.apiKey) {
        throw new Error("MarketDataService: apiKey is required for provider=finnhub");
      }
      this.aggregator = new TradeCandleAggregator({
        intervalMs: opts.candleIntervalMs ?? 15 * 60 * 1000,
        onCandleClose: (symbol, candle) => this.ingestCandle(symbol, candle)
      });
      this.finnhub = new FinnhubWsClient({
        apiKey: opts.apiKey,
        baseUrl: opts.finnhubBaseUrl,
        onTrade: (tr) => this.aggregator?.ingestTrade(tr)
      });
    }

    if (opts.provider === "binance") {
      this.binanceInterval = opts.binanceKlineInterval ?? "15m";
      this.binance = new BinanceWsClient({
        baseUrl: opts.binanceBaseUrl,
        onMessage: (frame) => {
          // ignore non-kline frames
          if (!frame || typeof frame !== "object") return;
          const f: any = frame;
          if (f.e !== "kline" || !f.k) return;
          const parsed = parseBinanceKlineToCandle(f);
          if (parsed.isClosed) {
            this.ingestCandle(parsed.symbol, parsed.candle);
          }
        }
      });
    }
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
    if (this.finnhub) {
      this.finnhub.connect();
      return;
    }
    if (this.binance) {
      this.binance.connect();
      return;
    }
    if (this.ws) return;
    if (!onRawMessage) {
      throw new Error("MarketDataService.connect: onRawMessage is required in legacy mode");
    }
    if (!this.url) {
      throw new Error("MarketDataService: url is required when not using a provider");
    }
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
    this.finnhub?.disconnect();
    this.binance?.disconnect();
    this.ws?.close();
    this.ws = null;
  }

  /** Helper para desarrollo: inserta una vela ya normalizada en el buffer. */
  ingestCandle(symbol: string, candle: Candle): void {
    this.getBuffer(symbol).push(candle);
  }

  subscribe(symbol: string): void {
    this.finnhub?.subscribe(symbol);
    if (this.binance) {
      this.binance.subscribeKlines(symbol, this.binanceInterval);
    }
  }

  unsubscribe(symbol: string): void {
    this.finnhub?.unsubscribe(symbol);
    if (this.binance) {
      this.binance.unsubscribeKlines(symbol, this.binanceInterval);
    }
  }
}

