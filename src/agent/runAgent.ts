import { HumanMessage, type BaseMessage } from "@langchain/core/messages";
import {
  createTraceCollector,
  detectTraceLoopWarnings,
  formatTraceForConsole,
  type AgentTraceStep
} from "./agentTrace.js";
import { createGraph } from "./createGraph.js";

export interface RunAgentOptions {
  verbose?: boolean;
  /** Turnos previos (sin el mensaje actual); `input` es solo la última pregunta del usuario. */
  chatHistory?: BaseMessage[];
  /**
   * Incluye en la respuesta `trace` / `traceWarnings` (callbacks LangChain: modelo + herramientas).
   * En HTTP puedes usar `debug: true` en el body o `AGENT_TRACE=true` en entorno.
   */
  includeTrace?: boolean;
}

export interface RunAgentResult {
  reply: string;
  trace?: AgentTraceStep[];
  /** Heurísticas: misma herramienta con el mismo input muchas veces seguidas, etc. */
  traceWarnings?: string[];
}

export async function runAgent(input: string, options: RunAgentOptions = {}): Promise<RunAgentResult> {
  const history = options.chatHistory ?? [];
  const includeTrace = options.includeTrace === true;
  const traceCollector = includeTrace ? createTraceCollector() : null;

  const graph = createGraph();
  const result = await graph.invoke(
    { messages: [...history, new HumanMessage(input)] },
    traceCollector ? { callbacks: [traceCollector.handler] } : undefined
  );

  const reply = typeof (result as any)?.reply === "string" ? String((result as any).reply) : "";

  if (!traceCollector) {
    return { reply };
  }

  const trace = traceCollector.steps;
  const traceWarnings = trace.length > 0 ? detectTraceLoopWarnings(trace) : [];

  if (options.verbose && trace.length > 0) {
    console.error("\n[agent trace]\n" + formatTraceForConsole(trace));
    if (traceWarnings.length > 0) {
      console.error("\n[agent trace avisos]\n" + traceWarnings.join("\n"));
    }
  }

  return { reply, trace, traceWarnings };
}
