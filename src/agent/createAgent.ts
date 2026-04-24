import { createAgent, type ReactAgent } from "langchain";
import { createModel } from "./model.js";
import { httpGetApiTiendaTool } from "./tools/store.js";
import { agentSystemPrompt } from "./prompt.js";

export const agentTools = [httpGetApiTiendaTool];

export function buildAgentExecutor(): ReactAgent {
  return createAgent({
    model: createModel(),
    tools: agentTools,
    systemPrompt: agentSystemPrompt
  });
}
