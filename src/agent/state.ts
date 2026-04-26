import { z } from "zod";

export const technicalIndicatorsSchema = z.object({
  rsi14: z.number().nullable().default(null),
  macd: z
    .object({
      macd: z.number(),
      signal: z.number(),
      histogram: z.number()
    })
    .nullable()
    .default(null),
  prevMacd: z
    .object({
      macd: z.number(),
      signal: z.number(),
      histogram: z.number()
    })
    .nullable()
    .default(null)
});

export const llmEvaluationSchema = z.object({
  should_alert: z.boolean(),
  action: z.enum(["watch", "wait", "avoid"]).default("watch"),
  confidence: z.number().min(0).max(1),
  reason: z.string().min(1),
  risk_level: z.enum(["low", "medium", "high"]).default("medium")
});

export const agentStateSchema = z.object({
  /** Historia previa (mensajes LangChain) + último input ya incorporado. */
  messages: z.any(),

  /** Símbolo a analizar (default: AAPL). */
  symbol: z.string().default("AAPL"),

  /** Metadata de velas usadas para el cálculo (15m). */
  candles: z.object({
    timeframe: z.string().default("15m"),
    count: z.number().int().nonnegative().default(0),
    lastCandleTime: z.number().nullable().default(null)
  }).default({ timeframe: "15m", count: 0, lastCandleTime: null }),

  indicators: technicalIndicatorsSchema.default({
    rsi14: null,
    macd: null,
    prevMacd: null
  }),

  /** Señal técnica previa al LLM (para filtrar costo). */
  technicalSignal: z.object({
    hasPotential: z.boolean().default(false),
    reasons: z.array(z.string()).default([])
  }).default({ hasPotential: false, reasons: [] }),

  llm: z.object({
    evaluation: llmEvaluationSchema.nullable().default(null),
    raw: z.string().nullable().default(null),
    parseError: z.string().nullable().default(null)
  }).default({ evaluation: null, raw: null, parseError: null }),

  /** Respuesta final del asistente. */
  reply: z.string().default("")
});

export type AgentState = z.infer<typeof agentStateSchema>;

