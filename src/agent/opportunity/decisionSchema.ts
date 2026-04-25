import { z } from "zod";

export const opportunityPrioritySchema = z.enum(["low", "medium", "high"]);

export const opportunityDecisionSchema = z.object({
  should_alert: z.boolean(),
  confidence: z.number().min(0).max(1),
  priority: opportunityPrioritySchema,
  message: z.string().min(1).max(500),
  reasoning: z.array(z.string().min(1)).min(1).max(10),
});

export type OpportunityDecision = z.infer<typeof opportunityDecisionSchema>;

export const opportunitySignalSchema = z.object({
  symbol: z.string().min(1),
  timestamp: z.number(),
  type: z.enum(["reversal", "overbought"]),
  strength: z.number(),
  conditions: z.array(z.string()),
  indicators: z.object({
    rsi: z.number(),
    macd: z.object({
      value: z.number(),
      signal: z.number(),
      histogram: z.number(),
    }),
  }),
});

export type OpportunitySignal = z.infer<typeof opportunitySignalSchema>;

export function parseDecision(raw: unknown): OpportunityDecision | null {
  const r = opportunityDecisionSchema.safeParse(raw);
  return r.success ? r.data : null;
}
