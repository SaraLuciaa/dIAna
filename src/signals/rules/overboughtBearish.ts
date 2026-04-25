import { strengthFromSatisfied } from "../strength.js";
import type { RuleEvaluation, SignalDetectorInput, SignalRule } from "../types.js";

const RSI_OVERBOUGHT = 70;

export const overboughtBearishRule: SignalRule = {
  type: "overbought",
  id: "overbought_bearish",
  evaluate(input: SignalDetectorInput): RuleEvaluation | null {
    const rsi = input.indicators.rsi;
    const rsiOk = rsi > RSI_OVERBOUGHT;
    if (!rsiOk) return null;
    return {
      strength: strengthFromSatisfied(1),
      conditions: [`RSI > ${RSI_OVERBOUGHT}`],
    };
  },
};
