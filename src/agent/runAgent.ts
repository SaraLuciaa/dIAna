import { HumanMessage, type BaseMessage } from "@langchain/core/messages";
import type { ReactAgent } from "langchain";
import {
  createTraceCollector,
  detectTraceLoopWarnings,
  formatTraceForConsole,
  type AgentTraceStep
} from "./agentTrace.js";
import { buildAgentExecutor } from "./createAgent.js";

type AgentInvoker = Pick<ReactAgent, "invoke">;

export interface RunAgentOptions {
  executor?: AgentInvoker;
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

function lastAiText(messages: BaseMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m._getType() === "ai") {
      return String(m.content ?? "");
    }
  }
  return "";
}

export async function runAgent(input: string, options: RunAgentOptions = {}): Promise<RunAgentResult> {
  const agent = options.executor ?? buildAgentExecutor();
  const history = options.chatHistory ?? [];
  const includeTrace = options.includeTrace === true;
  const traceCollector = includeTrace ? createTraceCollector() : null;

  const result = await agent.invoke(
    {
      messages: [...history, new HumanMessage(input)]
    },
    traceCollector ? { callbacks: [traceCollector.handler] } : undefined
  );

  const msgs = (result as { messages?: BaseMessage[] }).messages ?? [];
  const reply = lastAiText(msgs);

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
