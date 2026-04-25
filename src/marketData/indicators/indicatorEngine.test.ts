import assert from "node:assert/strict";
import test from "node:test";
import { macdLast, rsiWilderLast } from "./batch.js";
import { IndicatorEngine } from "./indicatorEngine.js";
import type { NormalizedCandle } from "../types.js";

function c(
  ts: number,
  close: number,
  closed: boolean,
): NormalizedCandle {
  return {
    symbol: "X",
    timestamp: ts,
    open: close,
    high: close,
    low: close,
    close,
    volume: 1,
    is_closed: closed,
  };
}

test("incremental closed path matches batch on every bar", () => {
  const rng = mulberry32(42);
  const closes: number[] = [];
  const engine = new IndicatorEngine();
  for (let i = 0; i < 120; i++) {
    const prev = closes[closes.length - 1] ?? 100;
    const close = prev + (rng() - 0.5) * 2;
    closes.push(close);
    const snap = engine.update(c(1_000 + i, close, true));
    const rsiB = rsiWilderLast(closes, 14);
    const macdB = macdLast(closes, 12, 26, 9);
    if (rsiB === null || macdB === null) {
      assert.equal(snap, null);
      continue;
    }
    assert.ok(snap);
    assertApprox(snap!.rsi, rsiB);
    assertApprox(snap!.macd.value, macdB.value);
    assertApprox(snap!.macd.signal, macdB.signal);
    assertApprox(snap!.macd.histogram, macdB.histogram);
  }
});

test("open candle preview does not advance incremental state", () => {
  const engine = new IndicatorEngine();
  const closes = [100, 102, 101, 103, 105, 104, 106, 108, 107, 109, 110, 111, 112, 113, 114, 115, 114, 116, 117, 116, 118, 119, 118, 120, 121, 120, 122, 123, 122, 124, 125, 124, 126, 127, 126, 128, 129, 128, 130, 131];
  for (let i = 0; i < closes.length; i++) {
    engine.update(c(10 + i, closes[i]!, true));
  }
  const baseline = engine.update(c(10 + closes.length - 1, 999, false));
  assert.ok(baseline);
  const again = engine.update(c(10 + closes.length - 1, 200, false));
  assert.ok(again);
  assert.notEqual(again.rsi, baseline.rsi);
  const afterClosed = engine.update(c(10 + closes.length, 132, true));
  assert.ok(afterClosed);
  assertApprox(afterClosed.rsi, rsiWilderLast([...closes, 132], 14)!);
});

test("computeWindow matches streaming after same sequence", () => {
  const seq = Array.from({ length: 50 }, (_, i) => 100 + Math.sin(i / 3) * 5);
  const candles = seq.map((close, i) => c(i, close, true));
  const eng = new IndicatorEngine();
  let streamed: ReturnType<IndicatorEngine["update"]> = null;
  for (const x of candles) streamed = eng.update(x);
  const win = new IndicatorEngine().computeWindow(candles);
  assert.deepEqual(streamed, win);
});

test("returns null for invalid numbers", () => {
  const eng = new IndicatorEngine();
  assert.equal(
    eng.update({
      symbol: "X",
      timestamp: 1,
      open: NaN,
      high: 1,
      low: 1,
      close: 1,
      volume: 1,
      is_closed: true,
    }),
    null,
  );
});

function assertApprox(a: number, b: number, eps = 1e-9): void {
  assert.ok(
    Math.abs(a - b) <= eps,
    `expected ${a} ≈ ${b} (|Δ|=${Math.abs(a - b)})`,
  );
}

function mulberry32(seed: number): () => number {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
