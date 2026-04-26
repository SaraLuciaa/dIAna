import test from "node:test";
import assert from "node:assert/strict";
import { parseBinanceKlineToCandle } from "./parseKline.js";

test("parseBinanceKlineToCandle parses closed kline frame", () => {
  const frame: any = {
    e: "kline",
    E: 1,
    s: "BTCUSDT",
    k: {
      t: 1000,
      T: 1999,
      s: "BTCUSDT",
      i: "15m",
      o: "100",
      c: "110",
      h: "120",
      l: "90",
      v: "12.5",
      x: true
    }
  };
  const out = parseBinanceKlineToCandle(frame);
  assert.equal(out.symbol, "BTCUSDT");
  assert.equal(out.interval, "15m");
  assert.equal(out.isClosed, true);
  assert.deepEqual(out.candle, { time: 1000, open: 100, high: 120, low: 90, close: 110, volume: 12.5 });
});

