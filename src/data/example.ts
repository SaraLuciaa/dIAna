import { MarketDataService } from "./marketDataService.js";
import { getEnv } from "../config/env.js";

/**
 * Demo Finnhub (trades) → velas 15m (candleClose) → CandleBuffer.
 *
 * Uso:
 * - `npm run dev:marketdata -- AAPL MSFT`
 *
 * Nota: Una vela de 15m puede tardar en cerrarse. Para ver actividad inmediata,
 * mira el log de conexión y suscripción; el cierre ocurrirá al cambiar el bucket.
 */
const env = getEnv();
const symbols = process.argv.slice(2).map((s) => s.trim()).filter(Boolean);
if (symbols.length === 0) {
  symbols.push("AAPL");
}

const svc = new MarketDataService({
  provider: "finnhub",
  apiKey: env.FINNHUB_API_KEY,
  finnhubBaseUrl: env.FINNHUB_WS_BASE_URL,
  candleIntervalMs: 15 * 60 * 1000
});

console.log(`[marketdata] connecting to Finnhub trades WS… symbols=${symbols.join(",")}`);
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

