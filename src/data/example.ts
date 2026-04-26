import { MarketDataService } from "./marketDataService.js";
import { getEnv } from "../config/env.js";

/**
 * Demo Binance (klines) → velas cerradas → CandleBuffer.
 *
 * Uso:
 * - `npm run dev:marketdata -- BTCUSDT ETHUSDT`
 *
 * Nota: Solo se inserta en el buffer cuando `x=true` (vela cerrada).
 */
const env = getEnv();
const symbols = process.argv.slice(2).map((s) => s.trim()).filter(Boolean);
if (symbols.length === 0) {
  symbols.push("BTCUSDT");
}

const svc = new MarketDataService({
  provider: "binance",
  binanceBaseUrl: env.BINANCE_WS_BASE_URL,
  binanceKlineInterval: "15m"
});

console.log(`[marketdata] connecting to Binance klines WS… symbols=${symbols.join(",")}`);
svc.connect();
for (const s of symbols) {
  svc.subscribe(s);
  console.log(`[marketdata] subscribed: ${s.toUpperCase()}`);
}

setInterval(() => {
  for (const s of symbols) {
    const b = svc.getBuffer(s);
    const last = b.last();
    if (last) {
      console.log(
        `[buffer] ${s.toUpperCase()} candles=${b.size()} last.time=${new Date(last.time).toISOString()} close=${last.close}`
      );
    }
  }
}, 15_000);

process.on("SIGINT", () => {
  console.log("\n[marketdata] shutting down…");
  for (const s of symbols) svc.unsubscribe(s);
  svc.disconnect();
  process.exit(0);
});

