import { BinanceKlineStream } from "./binanceKlineStream.js";

// Simple example consumer:
// - callback subscription
// - async iterator consumption

async function main(): Promise<void> {
  const symbol = (process.argv[2] ?? "BTCUSDT").trim().toUpperCase();
  let events = 0;
  let openUpdates = 0;
  let closedCandles = 0;

  const stream = new BinanceKlineStream({
    symbol,
    logger: ({ level, message, meta }) => {
      const suffix = meta ? ` ${JSON.stringify(meta)}` : "";
      // Keep it simple for MVP: stderr for logs, stdout for candles.
      console.error(`[${level}] ${message}${suffix}`);
    }
  });

  // Callback-based consumption (example: push into another component / queue).
  stream.onCandle((candle) => {
    events++;
    if (candle.is_closed) closedCandles++;
    else openUpdates++;

    if (candle.is_closed) {
      // Emit only closed candles here, but that decision belongs to the consumer.
      // For demo: print them.
      console.log(JSON.stringify(candle));
    }
  });

  await stream.start();

  // Heartbeat: Binance envía muchas actualizaciones con `is_closed:false` mientras la vela está abierta.
  // Si solo imprimes `is_closed:true`, puede parecer “colgado” hasta que cierre el minuto.
  setInterval(() => {
    console.error(
      `[heartbeat] events=${events} openUpdates=${openUpdates} closedCandles=${closedCandles}`
    );
  }, 10_000).unref();

  // Async iterator consumption (optional): prints every event if you uncomment.
  // for await (const candle of stream.stream()) {
  //   console.log(JSON.stringify(candle));
  // }

  // Keep process alive; Ctrl+C to stop.
  process.on("SIGINT", async () => {
    await stream.stop();
    process.exit(0);
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

