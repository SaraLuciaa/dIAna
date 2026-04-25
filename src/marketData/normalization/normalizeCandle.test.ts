import assert from "node:assert/strict";
import test from "node:test";
import { normalizeCandle, registerCandleNormalizer } from "./normalizeCandle.js";

test("binance: normalizes a typical kline payload (object)", () => {
  const raw = {
    stream: "btcusdt@kline_1m",
    e: "kline",
    E: 1710000000999,
    s: "BTCUSDT",
    k: {
      t: 1710000000000,
      T: 1710000059999,
      s: "BTCUSDT",
      i: "1m",
      o: "65000.0",
      h: "65200.0",
      l: "64800.0",
      c: "65100.0",
      v: "123.45",
      x: true,
      ignored: { nested: true }
    }
  };

  const candle = normalizeCandle(raw, { provider: "binance", interval: "1m" });
  assert.deepEqual(candle, {
    symbol: "BTCUSDT",
    timestamp: 1710000000,
    open: 65000,
    high: 65200,
    low: 64800,
    close: 65100,
    volume: 123.45,
    is_closed: true
  });
});

test("binance: accepts JSON string input", () => {
  const raw =
    '{"e":"kline","s":"BTCUSDT","k":{"t":1710000000000,"s":"BTCUSDT","i":"1m","o":"1","h":"2","l":"0.5","c":"1.5","v":"10","x":false}}';

  const candle = normalizeCandle(raw, { provider: "binance" });
  assert.equal(candle?.symbol, "BTCUSDT");
  assert.equal(candle?.timestamp, 1710000000);
  assert.equal(candle?.is_closed, false);
});

test("binance: skips wrong interval", () => {
  const raw = {
    e: "kline",
    s: "BTCUSDT",
    k: { t: 1710000000000, s: "BTCUSDT", i: "5m", o: "1", h: "2", l: "1", c: "1", v: "1", x: false }
  };

  const candle = normalizeCandle(raw, { provider: "binance", interval: "1m" });
  assert.equal(candle, null);
});

test("unknown shapes return null (no throw)", () => {
  assert.equal(normalizeCandle({ hello: "world" }), null);
  assert.equal(normalizeCandle("not-json"), null);
});

test("registerCandleNormalizer allows custom providers", () => {
  registerCandleNormalizer("acme", (raw) => {
    if (!raw || typeof raw !== "object") return null;
    const r = raw as Record<string, unknown>;
    if (r.type !== "candle") return null;
    return {
      symbol: "BTCUSDT",
      timestamp: 1,
      open: 1,
      high: 1,
      low: 1,
      close: 1,
      volume: 1,
      is_closed: true
    };
  });

  const candle = normalizeCandle({ type: "candle", extra: true }, { provider: "acme" });
  assert.equal(candle?.symbol, "BTCUSDT");
});
