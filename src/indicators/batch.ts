/**
 * Pure batch math used for previews and test/reference parity with incremental state.
 */

export function emaAlpha(period: number): number {
  return 2 / (period + 1);
}

/** SMA seed at index (period - 1), then EMA. Undefined before first valid output index. */
export function emaSeries(
  values: readonly number[],
  period: number,
): (number | undefined)[] {
  const out: (number | undefined)[] = values.map(() => undefined);
  if (values.length < period) return out;
  let ema = 0;
  for (let i = 0; i < period; i++) ema += values[i]!;
  ema /= period;
  out[period - 1] = ema;
  const k = emaAlpha(period);
  for (let i = period; i < values.length; i++) {
    ema = values[i]! * k + ema * (1 - k);
    out[i] = ema;
  }
  return out;
}

export function rsiWilderLast(
  closes: readonly number[],
  period: number,
): number | null {
  const n = closes.length;
  if (n < period + 1) return null;
  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const ch = closes[i]! - closes[i - 1]!;
    if (ch >= 0) avgGain += ch;
    else avgLoss += -ch;
  }
  avgGain /= period;
  avgLoss /= period;
  for (let i = period + 1; i < n; i++) {
    const ch = closes[i]! - closes[i - 1]!;
    const gain = ch > 0 ? ch : 0;
    const loss = ch < 0 ? -ch : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }
  if (avgLoss === 0) return avgGain === 0 ? 50 : 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

export function macdLast(
  closes: readonly number[],
  fastPeriod: number,
  slowPeriod: number,
  signalPeriod: number,
): { value: number; signal: number; histogram: number } | null {
  const fast = emaSeries(closes, fastPeriod);
  const slow = emaSeries(closes, slowPeriod);
  const macdPts: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    const f = fast[i];
    const s = slow[i];
    if (f !== undefined && s !== undefined) macdPts.push(f - s);
  }
  if (macdPts.length < signalPeriod) return null;
  const sig = emaSeries(macdPts, signalPeriod);
  const lastSig = sig[macdPts.length - 1];
  const lastLine = macdPts[macdPts.length - 1]!;
  if (lastSig === undefined) return null;
  return {
    value: lastLine,
    signal: lastSig,
    histogram: lastLine - lastSig,
  };
}
