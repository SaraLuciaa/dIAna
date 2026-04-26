import type { Candle } from "../../candleBuffer.js";
import type { BinanceKlineStreamFrame } from "./types.js";

export function parseBinanceKlineToCandle(frame: BinanceKlineStreamFrame): {
  symbol: string;
  interval: string;
  candle: Candle;
  isClosed: boolean;
} {
  const symbol = String(frame.s ?? frame.k?.s ?? "").toUpperCase();
  const interval = String(frame.k?.i ?? "");
  const k = frame.k;
  const candle: Candle = {
    time: Number(k.t),
    open: Number(k.o),
    high: Number(k.h),
    low: Number(k.l),
    close: Number(k.c),
    volume: Number.isFinite(Number(k.v)) ? Number(k.v) : undefined
  };
  return { symbol, interval, candle, isClosed: Boolean(k.x) };
}

