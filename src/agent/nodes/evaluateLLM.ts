import { SystemMessage, type BaseMessage } from "@langchain/core/messages";
import type { ChatOpenAI } from "@langchain/openai";
import type { AgentState } from "../state.js";
import { agentSystemPrompt } from "../prompt.js";

export async function evaluateLLMNode(
  state: AgentState,
  deps: { model: ChatOpenAI }
): Promise<Partial<AgentState>> {
  const msgs = (state.messages ?? []) as BaseMessage[];
  const result = await deps.model.invoke([new SystemMessage(agentSystemPrompt), ...msgs]);
  return { reply: String(result.content ?? "") };
}

