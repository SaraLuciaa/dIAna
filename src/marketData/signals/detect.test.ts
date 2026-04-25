import assert from "node:assert/strict";
import test from "node:test";
import { detect } from "./detect.js";
import { reversalBullishRule } from "./rules/reversalBullish.js";
import { overboughtBearishRule } from "./rules/overboughtBearish.js";
import type { SignalDetectorInput } from "./types.js";

function base(
  overrides: Partial<SignalDetectorInput> & {
    indicators: SignalDetectorInput["indicators"];
  },
): SignalDetectorInput {
  return {
    symbol: "BTCUSDT",
    timestamp: 1,
    ...overrides,
    indicators: overrides.indicators,
  };
}

test("overbought when RSI > 70", () => {
  const s = detect(
    base({
      indicators: {
        rsi: 71,
        macd: { value: 0, signal: 0, histogram: 0 },
      },
    }),
  );
  assert.ok(s);
  assert.equal(s!.type, "overbought");
  assertApprox(s!.strength, 1 / 3);
  assert.deepEqual(s!.conditions, ["RSI > 70"]);
});

test("reversal when RSI < 30 and MACD bullish cross", () => {
  const s = detect(
    base({
      indicators: {
        rsi: 28,
        macd: { value: 2, signal: 1, histogram: 0 },
      },
      previousMacd: { value: 0, signal: 1, histogram: -0.5 },
    }),
  );
  assert.ok(s);
  assert.equal(s!.type, "reversal");
  assertApprox(s!.strength, 2 / 3);
  assert.ok(s!.conditions.includes("RSI < 30"));
  assert.ok(s!.conditions.some((c) => c.startsWith("MACD")));
});

test("reversal when RSI < 30 and histogram turns positive", () => {
  const s = detect(
    base({
      indicators: {
        rsi: 25,
        macd: { value: -1, signal: -1, histogram: 0.1 },
      },
      previousMacd: { value: -1, signal: -1, histogram: -0.05 },
    }),
  );
  assert.ok(s);
  assert.equal(s!.type, "reversal");
  assertApprox(s!.strength, 2 / 3);
  assert.ok(
    s!.conditions.some((c) => c.includes("histogram turned positive")),
  );
});

test("no reversal without previousMacd (no MACD leg)", () => {
  const s = detect(
    base({
      indicators: {
        rsi: 20,
        macd: { value: 2, signal: 1, histogram: 1 },
      },
    }),
  );
  assert.equal(s, null);
});

test("no signal when thresholds not met", () => {
  assert.equal(
    detect(
      base({
        indicators: {
          rsi: 50,
          macd: { value: 0, signal: 0, histogram: 0 },
        },
      }),
    ),
    null,
  );
});

test("invalid numbers yield null", () => {
  assert.equal(
    detect(
      base({
        indicators: {
          rsi: Number.NaN,
          macd: { value: 0, signal: 0, histogram: 0 },
        },
      }),
    ),
    null,
  );
});

test("custom rule list", () => {
  const onlyReversal = detect(
    base({
      indicators: {
        rsi: 25,
        macd: { value: 2, signal: 1, histogram: 0 },
      },
      previousMacd: { value: 0, signal: 2, histogram: -1 },
    }),
    [reversalBullishRule],
  );
  assert.ok(onlyReversal);
  assert.equal(onlyReversal!.type, "reversal");

  const onlyOb = detect(
    base({
      indicators: {
        rsi: 72,
        macd: { value: 0, signal: 0, histogram: 0 },
      },
    }),
    [overboughtBearishRule],
  );
  assert.ok(onlyOb);
  assert.equal(onlyOb!.type, "overbought");
});

function assertApprox(a: number, b: number, eps = 1e-12): void {
  assert.ok(
    Math.abs(a - b) <= eps,
    `expected ${a} ≈ ${b} (|Δ|=${Math.abs(a - b)})`,
  );
}
