import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { BinanceKlineHub } from "../../marketData/binanceKlineHub.js";

const hub = new BinanceKlineHub();

const subscribeSchema = z.object({
  symbol: z.string().min(1).describe("Par spot USDT en mayúsculas, ej: BTCUSDT"),
  buffer_max: z.coerce.number().int().positive().max(2000).optional().describe("Máximo de velas en RAM (ring buffer).")
});

const unsubscribeSchema = z.object({
  symbol: z.string().min(1).describe("Par spot USDT en mayúsculas, ej: BTCUSDT")
});

const recentSchema = z.object({
  symbol: z.string().min(1).describe("Par spot USDT en mayúsculas, ej: BTCUSDT"),
  limit: z.coerce.number().int().positive().max(500).default(20).describe("Cuántas últimas velas devolver."),
  only_closed: z
    .boolean()
    .optional()
    .describe(
      "Si true, filtra a velas cerradas (is_closed=true). Si false, incluye actualizaciones abiertas del minuto en curso. Si se omite, la tool devuelve un paquete mixto (preview abierto + últimas cerradas)."
    ),
  auto_wait_ms: z.coerce
    .number()
    .int()
    .nonnegative()
    .max(30_000)
    .default(5000)
    .describe(
      "Si el buffer aún no tiene eventos tras suscribirse, espera hasta estos ms para capturar al menos 1 update (solo aplica si hay suscripción activa)."
    )
});

const waitSchema = z.object({
  symbol: z.string().min(1).describe("Par spot USDT en mayúsculas, ej: BTCUSDT"),
  count: z.coerce.number().int().positive().max(50).describe("Cuántas velas coincidentes esperar."),
  timeout_ms: z.coerce
    .number()
    .int()
    .positive()
    .max(600_000)
    .default(200_000)
    .describe("Tiempo máximo de espera (ms). Para N velas cerradas de 1m, suele requerir ~(N-1) a N minutos."),
  only_closed: z
    .boolean()
    .optional()
    .describe("Si true (por defecto), cuenta solo velas cerradas (is_closed=true). Si false, cuenta cualquier update."),
  auto_subscribe: z
    .boolean()
    .optional()
    .describe("Si true y no hay suscripción activa, intenta suscribir automáticamente antes de esperar.")
});

export const marketDataSubscribeBinanceKline1mTool = tool(async (input: z.infer<typeof subscribeSchema>) => {
  const res = await hub.subscribe(input.symbol, { max: input.buffer_max });
  return JSON.stringify({ ok: true, ...res, active: hub.list() });
}, {
  name: "market_data_subscribe_binance_kline_1m",
  description:
    "Inicia (si no existe) la suscripción WebSocket a velas Binance de 1m para un símbolo y guarda un buffer pequeño en RAM. No calcula indicadores.",
  schema: subscribeSchema
});

export const marketDataUnsubscribeBinanceKline1mTool = tool(async (input: z.infer<typeof unsubscribeSchema>) => {
  const res = await hub.unsubscribe(input.symbol);
  return JSON.stringify({ ok: true, ...res, active: hub.list() });
}, {
  name: "market_data_unsubscribe_binance_kline_1m",
  description: "Detiene la suscripción WebSocket de 1m para un símbolo (si estaba activa).",
  schema: unsubscribeSchema
});

export const marketDataRecentCandlesTool = tool(async (input: z.infer<typeof recentSchema>) => {
  const sym = input.symbol.trim().toUpperCase();
  const mode = input.only_closed;

  // Pull a slightly wider tail so we can derive both "open forming" and "closed" previews.
  const tailN = Math.min(500, Math.max(input.limit, input.limit * 5, 50));
  let raw = hub.recent(sym, tailN);

  if (hub.isSubscribed(sym) && raw.length === 0 && input.auto_wait_ms > 0) {
    await hub.waitForCandles(sym, { count: 1, timeoutMs: input.auto_wait_ms, onlyClosed: false });
    raw = hub.recent(sym, tailN);
  }

  const closed = raw.filter((c) => c.is_closed);
  const openUpdates = raw.filter((c) => !c.is_closed);

  const lastClosed = closed.length > 0 ? closed[closed.length - 1]! : null;
  const lastOpen = openUpdates.length > 0 ? openUpdates[openUpdates.length - 1]! : null;

  const closedTail = closed.slice(-input.limit);

  if (mode === true) {
    return JSON.stringify({
      ok: true,
      symbol: sym,
      mode: "closed_only",
      count: closedTail.length,
      candles: closedTail,
      note: "Si ves 0 velas cerradas justo al suscribirte, es normal: la vela del minuto puede seguir abierta."
    });
  }

  if (mode === false) {
    return JSON.stringify({
      ok: true,
      symbol: sym,
      mode: "including_open_updates",
      count: raw.length,
      candles: raw.slice(-input.limit)
    });
  }

  // Mixed/default: help the model answer natural-language requests without extra flags.
  return JSON.stringify({
    ok: true,
    symbol: sym,
    mode: "mixed_preview",
    buffer_events: raw.length,
    latest_open: lastOpen,
    latest_closed: lastClosed,
    last_closed_candles: closedTail,
    last_raw_events: raw.slice(-Math.min(input.limit, raw.length))
  });
}, {
  name: "market_data_recent_candles",
  description:
    "Lee el buffer reciente. Si only_closed se omite, devuelve un preview mixto (última vela abierta en formación + últimas cerradas). Requiere suscripción activa.",
  schema: recentSchema
});

export const marketDataWaitForCandlesTool = tool(async (input: z.infer<typeof waitSchema>) => {
  const sym = input.symbol.trim().toUpperCase();

  if (input.auto_subscribe === true && !hub.isSubscribed(sym)) {
    await hub.subscribe(sym);
  }

  const onlyClosed = input.only_closed !== false;
  const res = await hub.waitForCandles(sym, {
    count: input.count,
    timeoutMs: input.timeout_ms,
    onlyClosed
  });

  return JSON.stringify({
    ok: true,
    symbol: sym,
    only_closed: onlyClosed,
    timed_out: res.timedOut,
    received: res.received,
    wanted: input.count,
    candles: res.candles
  });
}, {
  name: "market_data_wait_for_candles",
  description:
    "Espera (bloqueando dentro de la tool) hasta recibir count eventos que cumplan el filtro (por defecto solo cerradas). Útil en CLI donde no hay un proceso persistente monitoreando.",
  schema: waitSchema
});

export const marketDataTools = [
  marketDataSubscribeBinanceKline1mTool,
  marketDataUnsubscribeBinanceKline1mTool,
  marketDataRecentCandlesTool,
  marketDataWaitForCandlesTool
] as const;
