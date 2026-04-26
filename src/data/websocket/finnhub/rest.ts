import type { Candle } from "../../candleBuffer.js";

type FinnhubCandleResponse = {
  c?: number[];
  h?: number[];
  l?: number[];
  o?: number[];
  t?: number[]; // seconds
  v?: number[];
  s?: string; // ok | no_data | error
  error?: string;
};

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Finnhub REST error: ${res.status} ${res.statusText}`);
  }
  return await res.json();
}

function toCandles(r: FinnhubCandleResponse): Candle[] {
  const t = r.t ?? [];
  const o = r.o ?? [];
  const h = r.h ?? [];
  const l = r.l ?? [];
  const c = r.c ?? [];
  const v = r.v ?? [];
  const out: Candle[] = [];
  const n = Math.min(t.length, o.length, h.length, l.length, c.length);
  for (let i = 0; i < n; i++) {
    out.push({
      time: Number(t[i]) * 1000,
      open: Number(o[i]),
      high: Number(h[i]),
      low: Number(l[i]),
      close: Number(c[i]),
      volume: Number.isFinite(Number(v[i])) ? Number(v[i]) : undefined
    });
  }
  return out;
}

export async function fetchFinnhubCandles15m(
  opts: { baseUrl?: string; apiKey: string; symbol: string; fromSec: number; toSec: number }
): Promise<Candle[]> {
  const base = (opts.baseUrl ?? "https://finnhub.io/api/v1").replace(/\/+$/, "");
  const symbol = encodeURIComponent(opts.symbol);
  const url =
    `${base}/stock/candle?symbol=${symbol}` +
    `&resolution=15&from=${opts.fromSec}&to=${opts.toSec}&token=${encodeURIComponent(opts.apiKey)}`;
  const data = (await fetchJson(url)) as FinnhubCandleResponse;
  if (data.s && data.s !== "ok") {
    throw new Error(`Finnhub candle status: ${data.s}${data.error ? ` (${data.error})` : ""}`);
  }
  return toCandles(data);
}

