import { HumanMessage, type BaseMessage } from "@langchain/core/messages";
import type { ReactAgent } from "langchain";
import { buildAgentExecutor } from "./createAgent.js";

type AgentInvoker = Pick<ReactAgent, "invoke">;

export interface RunAgentOptions {
  executor?: AgentInvoker;
  verbose?: boolean;
  /** Turnos previos (sin el mensaje actual); `input` es solo la última pregunta del usuario. */
  chatHistory?: BaseMessage[];
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

export async function runAgent(
  input: string,
  options: RunAgentOptions = {}
): Promise<string> {
  const agent = options.executor ?? buildAgentExecutor();
  const history = options.chatHistory ?? [];
  const result = await agent.invoke({
    messages: [...history, new HumanMessage(input)]
  });

  const msgs = (result as { messages?: BaseMessage[] }).messages ?? [];
  return lastAiText(msgs);
}
