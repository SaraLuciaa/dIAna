import { detect } from "./detect.js";

console.log(
  "Overbought:",
  detect({
    symbol: "BTCUSDT",
    timestamp: 1_710_000_000,
    indicators: {
      rsi: 72,
      macd: { value: 1, signal: 2, histogram: -0.5 },
    },
  }),
);

console.log(
  "Reversal (MACD cross):",
  detect({
    symbol: "BTCUSDT",
    timestamp: 1_710_000_060,
    indicators: {
      rsi: 28.4,
      macd: { value: -120.5, signal: -130.2, histogram: 2 },
    },
    previousMacd: { value: -135, signal: -130, histogram: -1 },
  }),
);

console.log(
  "Reversal (histogram turn):",
  detect({
    symbol: "BTCUSDT",
    timestamp: 1_710_000_120,
    indicators: {
      rsi: 25,
      macd: { value: -1, signal: -2, histogram: 0.5 },
    },
    previousMacd: { value: -2, signal: -1, histogram: -0.1 },
  }),
);

console.log(
  "No signal (RSI ok but no MACD trigger / no previous):",
  detect({
    symbol: "BTCUSDT",
    timestamp: 1_710_000_180,
    indicators: {
      rsi: 28,
      macd: { value: -120, signal: -130, histogram: 9.7 },
    },
  }),
);
