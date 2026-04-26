import test from "node:test";
import assert from "node:assert/strict";
import { TradeCandleAggregator } from "./tradeToCandle.js";

test("TradeCandleAggregator aggregates OHLCV and closes on bucket change", () => {
  const closed: any[] = [];
  const agg = new TradeCandleAggregator({
    intervalMs: 60_000,
    onCandleClose: (s, c) => closed.push({ s, c })
  });

  // bucket 0
  agg.ingestTrade({ s: "AAPL", p: 10, t: 10_000, v: 1 });
  agg.ingestTrade({ s: "AAPL", p: 12, t: 20_000, v: 2 });
  agg.ingestTrade({ s: "AAPL", p: 11, t: 50_000, v: 3 });

  const cur0 = agg.getCurrentCandle("AAPL");
  assert.ok(cur0);
  assert.equal(cur0?.time, 0);
  assert.equal(cur0?.open, 10);
  assert.equal(cur0?.high, 12);
  assert.equal(cur0?.low, 10);
  assert.equal(cur0?.close, 11);
  assert.equal(cur0?.volume, 6);

  // move to bucket 60s -> closes previous
  agg.ingestTrade({ s: "AAPL", p: 9, t: 70_000, v: 1 });
  assert.equal(closed.length, 1);
  assert.equal(closed[0].s, "AAPL");
  assert.equal(closed[0].c.time, 0);
  assert.equal(closed[0].c.close, 11);

  const cur1 = agg.getCurrentCandle("AAPL");
  assert.ok(cur1);
  assert.equal(cur1?.time, 60_000);
  assert.equal(cur1?.open, 9);
  assert.equal(cur1?.close, 9);
});

