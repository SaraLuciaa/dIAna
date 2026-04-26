import type { BaseMessage } from "@langchain/core/messages";
import { getEnv } from "../../config/env.js";
import { CandleBuffer } from "../../data/candleBuffer.js";
import { fetchBinanceKlines } from "../../data/websocket/binance/rest.js";
import { computeMacd_12_26_9, computeRsi14 } from "../../indicators/index.js";
import type { AgentState } from "../state.js";

function lastUserText(messages: BaseMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m._getType?.() === "human") return String((m as any).content ?? "");
  }
  return "";
}

function pickSymbol(text: string): string {
  // Heurística simple: primer token estilo par cripto (BTCUSDT, ETHUSDT, SOLUSDT).
  const t = text.toUpperCase();
  const m = t.match(/\b[A-Z0-9]{3,12}USDT\b/) ?? t.match(/\b[A-Z0-9]{3,12}\b/);
  return (m?.[0] ?? "BTCUSDT").trim();
}

function computeTechnicalSignal(args: {
  rsi: number | null;
  macd: { macd: number; signal: number } | null;
  prevMacd: { macd: number; signal: number } | null;
}): { hasPotential: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (args.rsi !== null) {
    if (args.rsi <= 35) reasons.push(`RSI(14) bajo (${args.rsi.toFixed(1)})`);
    if (args.rsi >= 65) reasons.push(`RSI(14) alto (${args.rsi.toFixed(1)})`);
  }
  if (args.macd && args.prevMacd) {
    const prevBull = args.prevMacd.macd <= args.prevMacd.signal;
    const curBull = args.macd.macd > args.macd.signal;
    const prevBear = args.prevMacd.macd >= args.prevMacd.signal;
    const curBear = args.macd.macd < args.macd.signal;
    if (prevBull && curBull) reasons.push("Cruce MACD alcista (MACD > Signal)");
    if (prevBear && curBear) reasons.push("Cruce MACD bajista (MACD < Signal)");
  }
  return { hasPotential: reasons.length > 0, reasons };
}

export async function computeIndicatorsNode(state: AgentState): Promise<Partial<AgentState>> {
  const env = getEnv();
  const msgs = (state.messages ?? []) as BaseMessage[];
  const userText = lastUserText(msgs);
  const symbol = pickSymbol(userText);

  const interval = "15m";
  const buffer = new CandleBuffer(600);
  let restError: string | null = null;
  try {
    const candles = await fetchBinanceKlines({
      baseUrl: env.BINANCE_REST_BASE_URL,
      symbol,
      interval,
      limit: 600
    });
    for (const c of candles) buffer.push(c);
  } catch (e) {
    restError = e instanceof Error ? e.message : String(e);
  }

  const closes = buffer.toArray().map((c) => c.close);
  const rsi = computeRsi14(closes);
  const macd = computeMacd_12_26_9(closes);
  const prevMacd = closes.length >= 2 ? computeMacd_12_26_9(closes.slice(0, -1)) : null;

  const technicalSignal = computeTechnicalSignal({
    rsi,
    macd: macd ? { macd: macd.macd, signal: macd.signal } : null,
    prevMacd: prevMacd ? { macd: prevMacd.macd, signal: prevMacd.signal } : null
  });

  const last = buffer.last();
  const restNote =
    restError && buffer.size() === 0
      ? {
          llm: {
            evaluation: null,
            raw: null,
            parseError: `No se pudo cargar histórico de velas ${interval} desde Binance REST: ${restError}`
          }
        }
      : {};
  return {
    symbol,
    candles: {
      timeframe: interval,
      count: buffer.size(),
      lastCandleTime: last ? last.time : null
    },
    indicators: { rsi14: rsi, macd, prevMacd },
    technicalSignal,
    ...(restNote as any)
  };
}

