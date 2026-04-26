import { HumanMessage, SystemMessage, type BaseMessage } from "@langchain/core/messages";
import type { ChatOpenAI } from "@langchain/openai";
import { llmEvaluationSchema, type AgentState } from "../state.js";
import { agentSystemPrompt } from "../prompt.js";

export async function evaluateLLMNode(
  state: AgentState,
  deps: { model: ChatOpenAI }
): Promise<Partial<AgentState>> {
  const msgs = (state.messages ?? []) as BaseMessage[];

  const tech = {
    symbol: state.symbol,
    timeframe: state.candles?.timeframe ?? "15m",
    candle_count: state.candles?.count ?? 0,
    rsi14: state.indicators?.rsi14 ?? null,
    macd: state.indicators?.macd ?? null,
    prevMacd: state.indicators?.prevMacd ?? null,
    technical_reasons: state.technicalSignal?.reasons ?? []
  };

  const instruction = `Analiza la señal técnica (RSI/MACD) para el símbolo indicado. Esto es educativo; NO des asesoría financiera personalizada.

Devuelve SOLO un JSON válido con este schema:
{
  "should_alert": boolean,
  "action": "watch" | "wait" | "avoid",
  "confidence": number (0..1),
  "reason": string,
  "risk_level": "low" | "medium" | "high"
}

Datos técnicos (no inventes datos adicionales):
${JSON.stringify(tech)}
`;

  const result = await deps.model.invoke([
    new SystemMessage(agentSystemPrompt),
    ...msgs,
    new HumanMessage(instruction)
  ]);

  const raw = String(result.content ?? "").trim();
  let evaluation: unknown = null;
  let parseError: string | null = null;
  try {
    const jsonText = raw.startsWith("```") ? raw.replace(/```[a-z]*\n?/gi, "").replace(/```/g, "").trim() : raw;
    evaluation = llmEvaluationSchema.parse(JSON.parse(jsonText));
  } catch (e) {
    parseError = e instanceof Error ? e.message : String(e);
  }

  return {
    llm: {
      evaluation: parseError ? null : (evaluation as any),
      raw,
      parseError
    }
  };
}

