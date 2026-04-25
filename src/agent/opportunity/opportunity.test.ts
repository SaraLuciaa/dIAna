import assert from "node:assert/strict";
import test from "node:test";
import { parseDecision, opportunitySignalSchema } from "./decisionSchema.js";
import { applyGuardrails } from "./guardrails.js";

test("parseDecision accepts valid payload", () => {
  const raw = {
    should_alert: true,
    confidence: 0.72,
    priority: "medium",
    message: "Possible bullish reversal due to oversold RSI and MACD crossover",
    reasoning: [
      "RSI indicates oversold conditions",
      "MACD crossover suggests momentum shift",
    ],
  };
  const d = parseDecision(raw);
  assert.ok(d);
  assert.equal(d!.should_alert, true);
  assert.equal(d!.priority, "medium");
});

test("parseDecision rejects invalid priority", () => {
  assert.equal(
    parseDecision({
      should_alert: false,
      confidence: 0.5,
      priority: "urgent",
      message: "x",
      reasoning: ["y"],
    }),
    null,
  );
});

test("applyGuardrails clamps confidence and forces low priority when no alert", () => {
  const signal = opportunitySignalSchema.parse({
    symbol: "BTCUSDT",
    timestamp: 1,
    type: "reversal",
    strength: 2 / 3,
    conditions: ["RSI < 30", "MACD cross"],
    indicators: {
      rsi: 28,
      macd: { value: 1, signal: 0, histogram: 0.5 },
    },
  });
  const d = applyGuardrails(signal, {
    should_alert: false,
    confidence: 1.5,
    priority: "high",
    message: "x".repeat(600),
    reasoning: ["a"],
  });
  assert.equal(d.should_alert, false);
  assert.equal(d.priority, "low");
  assert.equal(d.confidence, 1);
  assert.ok(d.message.length <= 500);
});

test("applyGuardrails suppresses weak-strength alerts", () => {
  const signal = opportunitySignalSchema.parse({
    symbol: "BTCUSDT",
    timestamp: 1,
    type: "reversal",
    strength: 0.4,
    conditions: ["RSI < 30"],
    indicators: {
      rsi: 25,
      macd: { value: 1, signal: 0, histogram: 1 },
    },
  });
  const d = applyGuardrails(signal, {
    should_alert: true,
    confidence: 0.9,
    priority: "high",
    message: "Alert",
    reasoning: ["Model liked it"],
  });
  assert.equal(d.should_alert, false);
  assert.ok(d.reasoning[0]!.includes("strength"));
});

test("applyGuardrails suppresses low-confidence alerts", () => {
  const signal = opportunitySignalSchema.parse({
    symbol: "BTCUSDT",
    timestamp: 1,
    type: "overbought",
    strength: 1 / 3,
    conditions: ["RSI > 70"],
    indicators: {
      rsi: 72,
      macd: { value: 0, signal: 0, histogram: 0 },
    },
  });
  const d = applyGuardrails(signal, {
    should_alert: true,
    confidence: 0.2,
    priority: "medium",
    message: "Maybe",
    reasoning: ["Unsure"],
  });
  assert.equal(d.should_alert, false);
  assert.ok(d.reasoning.some((r) => r.includes("confidence")));
});
