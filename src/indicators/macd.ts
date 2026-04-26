import { DEMA, EMA, MACD } from "trading-signals";

export interface MacdResult {
  macd: number;
  signal: number;
  histogram: number;
}

export function computeMacd_12_26_9(closes: number[]): MacdResult | null {
  if (closes.length < 35) return null;
  const macd = new MACD({
    indicator: EMA as unknown as typeof EMA | typeof DEMA,
    shortInterval: 12,
    longInterval: 26,
    signalInterval: 9
  });
  for (const c of closes) macd.add(c);
  const res = macd.getResult();
  if (!res) return null;
  const out: MacdResult = {
    macd: Number((res as any).macd?.toString?.() ?? (res as any).macd),
    signal: Number((res as any).signal?.toString?.() ?? (res as any).signal),
    histogram: Number((res as any).histogram?.toString?.() ?? (res as any).histogram)
  };
  if (![out.macd, out.signal, out.histogram].every((n) => Number.isFinite(n))) return null;
  return out;
}

