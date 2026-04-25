import { macdBullishCross, macdBullishTrigger, histogramTurnsPositive } from "./macdTriggers.js";
import { strengthFromSatisfied } from "../strength.js";
import type { RuleEvaluation, SignalDetectorInput, SignalRule } from "../types.js";

const RSI_OVERSOLD = 30;

function describeMacdLeg(curr: SignalDetectorInput): string {
  const prev = curr.previousMacd;
  if (!prev) return "MACD bullish crossover";
  if (macdBullishCross(curr.indicators.macd, prev))
    return "MACD bullish crossover";
  if (histogramTurnsPositive(curr.indicators.macd, prev))
    return "MACD histogram turned positive";
  return "MACD bullish crossover";
}

/**
 * Bullish reversal MVP: RSI oversold AND (MACD cross above signal OR histogram turns positive).
 * Requires `previousMacd` for the MACD leg; otherwise the MACD part is not satisfied (no noisy signal).
 */
export const reversalBullishRule: SignalRule = {
  type: "reversal",
  id: "reversal_bullish",
  evaluate(input: SignalDetectorInput): RuleEvaluation | null {
    const rsi = input.indicators.rsi;
    const rsiOk = rsi < RSI_OVERSOLD;
    const macdOk = macdBullishTrigger(
      input.indicators.macd,
      input.previousMacd,
    );
    if (!(rsiOk && macdOk)) return null;
    const conditions: string[] = [
      `RSI < ${RSI_OVERSOLD}`,
      describeMacdLeg(input),
    ];
    return {
      strength: strengthFromSatisfied(2),
      conditions,
    };
  },
};
