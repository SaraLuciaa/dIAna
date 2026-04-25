/**
 * Requires valid OpenRouter (or OpenAI-compatible) env in `env.local`.
 * Run: `npx tsx src/agent/opportunity/example.ts`
 */
import { evaluateOpportunity } from "./opportunityEvaluator.js";

const sample = {
  symbol: "BTCUSDT",
  timestamp: 1_710_000_000,
  type: "reversal" as const,
  strength: 0.65,
  conditions: ["RSI < 30", "MACD bullish crossover"],
  indicators: {
    rsi: 28.4,
    macd: {
      value: -120.5,
      signal: -130.2,
      histogram: 9.7,
    },
  },
};

const decision = await evaluateOpportunity(sample);
console.log(JSON.stringify(decision, null, 2));
