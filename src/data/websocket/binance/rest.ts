import type { Candle } from "../../candleBuffer.js";

type Kline = [
  number, // open time
  string, // open
  string, // high
  string, // low
  string, // close
  string, // volume
  number // close time
  // ... ignore rest
];

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Binance REST error: ${res.status} ${res.statusText}${body ? ` — ${body.slice(0, 200)}` : ""}`);
  }
  return await res.json();
}

export async function fetchBinanceKlines(
  opts: { baseUrl?: string; symbol: string; interval: string; limit?: number }
): Promise<Candle[]> {
  const base = (opts.baseUrl ?? "https://api.binance.com").replace(/\/+$/, "");
  const symbol = encodeURIComponent(opts.symbol.toUpperCase());
  const interval = encodeURIComponent(opts.interval);
  const limit = Math.min(1000, Math.max(1, opts.limit ?? 500));
  const url = `${base}/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
  const data = (await fetchJson(url)) as unknown;
  if (!Array.isArray(data)) return [];

  const out: Candle[] = [];
  for (const row of data as any[]) {
    if (!Array.isArray(row) || row.length < 7) continue;
    const k = row as Kline;
    out.push({
      time: Number(k[0]),
      open: Number(k[1]),
      high: Number(k[2]),
      low: Number(k[3]),
      close: Number(k[4]),
      volume: Number.isFinite(Number(k[5])) ? Number(k[5]) : undefined
    });
  }
  return out;
}

