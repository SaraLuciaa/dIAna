import { BaseCallbackHandler } from "@langchain/core/callbacks/base";
import type { BaseMessage } from "@langchain/core/messages";
import type { Serialized } from "@langchain/core/load/serializable";

export type AgentTraceStep =
  | { kind: "model"; at: string; runName?: string; promptCount?: number }
  | { kind: "tool_input"; at: string; runId: string; name: string; input: string }
  | {
      kind: "tool_output";
      at: string;
      runId: string;
      name: string;
      ok: boolean;
      outputChars: number;
      preview?: string;
      error?: string;
    };

function isoNow(): string {
  return new Date().toISOString();
}

function summarizeToolInput(input: string, max = 1200): string {
  const t = input.trim();
  if (t.length <= max) {
    return t;
  }
  return `${t.slice(0, max)}…`;
}

function summarizeToolOutput(
  output: unknown,
  previewMax = 400
): { chars: number; preview?: string } {
  if (typeof output === "string") {
    const preview =
      output.length > previewMax ? `${output.slice(0, previewMax)}…` : output;
    return { chars: output.length, preview };
  }
  try {
    const s = JSON.stringify(output);
    const preview = s.length > previewMax ? `${s.slice(0, previewMax)}…` : s;
    return { chars: s.length, preview };
  } catch {
    const t = String(output);
    return { chars: t.length, preview: t.slice(0, previewMax) };
  }
}

function pickToolName(serialized: Serialized, runName?: string): string {
  if (runName) {
    return runName;
  }
  const named = serialized as { name?: string };
  if (typeof named.name === "string" && named.name.length > 0) {
    return named.name;
  }
  if (Array.isArray(serialized.id)) {
    return serialized.id.join(".");
  }
  return "tool";
}

export function createTraceCollector(): {
  handler: BaseCallbackHandler;
  steps: AgentTraceStep[];
} {
  const steps: AgentTraceStep[] = [];
  const runIdToTool = new Map<string, string>();

  const handler = BaseCallbackHandler.fromMethods({
    handleChatModelStart(_llm, messages: BaseMessage[][], _runId, _parentRunId, _extra, _tags, _metadata, runName) {
      const n = Array.isArray(messages)
        ? messages.reduce((acc, batch) => acc + (batch?.length ?? 0), 0)
        : 0;
      steps.push({
        kind: "model",
        at: isoNow(),
        runName,
        promptCount: n
      });
    },
    handleToolStart(serialized, input, runId, _parentRunId, _tags, _metadata, runName) {
      const name = pickToolName(serialized, runName);
      runIdToTool.set(runId, name);
      steps.push({
        kind: "tool_input",
        at: isoNow(),
        runId,
        name,
        input: summarizeToolInput(input)
      });
    },
    handleToolEnd(output, runId) {
      const name = runIdToTool.get(runId) ?? "tool";
      runIdToTool.delete(runId);
      const { chars, preview } = summarizeToolOutput(output);
      steps.push({
        kind: "tool_output",
        at: isoNow(),
        runId,
        name,
        ok: true,
        outputChars: chars,
        preview
      });
    },
    handleToolError(err, runId) {
      const name = runIdToTool.get(runId) ?? "tool";
      runIdToTool.delete(runId);
      steps.push({
        kind: "tool_output",
        at: isoNow(),
        runId,
        name,
        ok: false,
        outputChars: 0,
        error: err instanceof Error ? err.message : String(err)
      });
    }
  });

  return { handler, steps };
}

export function detectTraceLoopWarnings(steps: AgentTraceStep[]): string[] {
  const warnings: string[] = [];
  const inputs: { name: string; input: string }[] = [];
  for (const s of steps) {
    if (s.kind === "tool_input") {
      inputs.push({ name: s.name, input: s.input });
    }
  }
  let streak = 1;
  for (let i = 1; i < inputs.length; i++) {
    const prev = inputs[i - 1];
    const cur = inputs[i];
    if (prev && cur && prev.name === cur.name && prev.input === cur.input) {
      streak++;
    } else {
      if (streak >= 3 && prev) {
        warnings.push(
          `La herramienta "${prev.name}" se invocó ${streak} veces seguidas con el mismo argumento; podría ser un bucle.`
        );
      }
      streak = 1;
    }
  }
  if (streak >= 3 && inputs.length > 0) {
    const last = inputs[inputs.length - 1];
    if (last) {
      warnings.push(
        `La herramienta "${last.name}" se invocó ${streak} veces seguidas con el mismo argumento; podría ser un bucle.`
      );
    }
  }
  const modelRuns = steps.filter((s) => s.kind === "model").length;
  if (modelRuns > 10) {
    warnings.push(
      `Hubo ${modelRuns} llamadas al modelo en una sola respuesta; conviene revisar si el agente está dando vueltas.`
    );
  }
  return [...new Set(warnings)];
}

export function formatTraceForConsole(steps: AgentTraceStep[]): string {
  const lines: string[] = [];
  for (const s of steps) {
    if (s.kind === "model") {
      lines.push(`[${s.at}] modelo ${s.runName ?? "(chat)"} prompts=${s.promptCount ?? "?"}`);
    } else if (s.kind === "tool_input") {
      lines.push(`[${s.at}] tool → ${s.name} input: ${s.input.replace(/\s+/g, " ").slice(0, 200)}${s.input.length > 200 ? "…" : ""}`);
    } else if (s.kind === "tool_output") {
      if (s.ok) {
        lines.push(`[${s.at}] tool ← ${s.name} ok chars=${s.outputChars}`);
      } else {
        lines.push(`[${s.at}] tool ← ${s.name} ERROR: ${s.error ?? "?"}`);
      }
    }
  }
  return lines.join("\n");
}
