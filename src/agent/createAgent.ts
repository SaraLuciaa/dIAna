import { createAgent, type ReactAgent } from "langchain";
import { createModel } from "./model.js";
import { agentSystemPrompt } from "./prompt.js";

export const agentTools = [];

export function buildAgentExecutor(): ReactAgent {
  return createAgent({
    model: createModel(),
    tools: agentTools,
    systemPrompt: agentSystemPrompt
  });
}
