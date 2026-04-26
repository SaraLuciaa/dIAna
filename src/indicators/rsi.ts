import { RSI } from "trading-signals";

export function computeRsi14(closes: number[]): number | null {
  if (closes.length < 15) return null;
  const rsi = new RSI(14);
  for (const c of closes) rsi.add(c);
  const v = rsi.getResult();
  if (!v) return null;
  const n = Number(v.toString());
  return Number.isFinite(n) ? n : null;
}

