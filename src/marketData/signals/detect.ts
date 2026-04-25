import { defaultSignalRules } from "./defaultRules.js";
import type {
  SignalDetectorInput,
  SignalRule,
  TradingSignal,
} from "./types.js";

function isFiniteMacd(m: SignalDetectorInput["indicators"]["macd"]): boolean {
  return (
    Number.isFinite(m.value) &&
    Number.isFinite(m.signal) &&
    Number.isFinite(m.histogram)
  );
}

function isValidInput(input: SignalDetectorInput): boolean {
  const { rsi, macd } = input.indicators;
  if (!Number.isFinite(rsi) || !isFiniteMacd(macd)) return false;
  if (input.previousMacd && !isFiniteMacd(input.previousMacd)) return false;
  return true;
}

function toSignal(
  input: SignalDetectorInput,
  type: TradingSignal["type"],
  strength: number,
  conditions: string[],
): TradingSignal {
  return {
    symbol: input.symbol ?? "UNKNOWN",
    timestamp: input.timestamp ?? 0,
    type,
    strength: Math.min(1, Math.max(0, strength)),
    conditions,
  };
}

/**
 * Deterministic rule pass: first matching rule wins (see `defaultSignalRules` order).
 * Returns `null` when no rule fully matches.
 */
export function detect(
  input: SignalDetectorInput,
  rules: readonly SignalRule[] = defaultSignalRules,
): TradingSignal | null {
  if (!isValidInput(input)) return null;
  for (const rule of rules) {
    const ev = rule.evaluate(input);
    if (ev) return toSignal(input, rule.type, ev.strength, ev.conditions);
  }
  return null;
}
