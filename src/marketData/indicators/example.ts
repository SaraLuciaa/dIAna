import { IndicatorEngine } from "./indicatorEngine.js";
import type { NormalizedCandle } from "../types.js";
import type { IndicatorSnapshot } from "./types.js";

function candle(
  ts: number,
  o: number,
  h: number,
  l: number,
  c: number,
  closed: boolean,
): NormalizedCandle {
  return {
    symbol: "BTCUSDT",
    timestamp: ts,
    open: o,
    high: h,
    low: l,
    close: c,
    volume: 1,
    is_closed: closed,
  };
}

/** Synthetic walk — enough bars to warm RSI + MACD signal. */
const closes = [
  100, 102, 101, 103, 105, 104, 106, 108, 107, 109, 110, 111, 112, 113, 114, 115,
  114, 116, 117, 116, 118, 119, 118, 120, 121, 120, 122, 123, 122, 124, 125, 124,
  126, 127, 126, 128, 129, 128, 130, 131,
];

const engine = new IndicatorEngine();
let last: IndicatorSnapshot | null = null;

for (let i = 0; i < closes.length; i++) {
  const c = closes[i]!;
  const snap = engine.update(
    candle(1_700_000_000 + i, c, c + 0.5, c - 0.5, c, true),
  );
  if (snap) last = snap;
}

console.log("Last closed snapshot:", last);

const intra = engine.update(
  candle(1_700_000_000 + closes.length - 1, 130, 132, 129, 131.25, false),
);
console.log("In-progress bar preview (does not advance state):", intra);

const windowOnly = new IndicatorEngine().computeWindow(
  closes.map((c, i) => candle(1_700_000_000 + i, c, c + 0.5, c - 0.5, c, true)),
);
console.log(
  "computeWindow matches streaming snapshot:",
  JSON.stringify(windowOnly) === JSON.stringify(last),
  { windowOnly, last },
);
