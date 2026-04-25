import { createAgent, type ReactAgent } from "langchain";
import { createModel } from "./model.js";
import { agentSystemPrompt } from "./prompt.js";
import { marketDataTools } from "./tools/marketData.js";

export const agentTools = [...marketDataTools];

export function buildAgentExecutor(): ReactAgent {
  return createAgent({
    model: createModel(),
    tools: agentTools,
    systemPrompt: agentSystemPrompt
  });
}
