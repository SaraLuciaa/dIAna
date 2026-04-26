import { MarketDataService } from "./marketDataService.js";

/**
 * Ejemplo mínimo para validar wiring del Data Layer.
 * En siguientes iteraciones se conectará a Finnhub/Binance y se normalizarán velas.
 */
const svc = new MarketDataService({ url: "wss://example.invalid" });

console.log(
  "MarketDataService creado. (Este script es un placeholder; configure un WS real en src/data/websocket/)."
);

svc.disconnect();

