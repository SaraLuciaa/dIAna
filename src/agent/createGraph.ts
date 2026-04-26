import { END, START, StateGraph, StateSchema } from "@langchain/langgraph";
import { z } from "zod";
import { createModel } from "./model.js";
import { agentStateSchema } from "./state.js";
import { computeIndicatorsNode } from "./nodes/computeIndicators.js";
import { decideActionNode } from "./nodes/decideAction.js";
import { evaluateLLMNode } from "./nodes/evaluateLLM.js";
import { notifyNode } from "./nodes/notify.js";

const AgentStateSchema = new StateSchema({
  // Keep this lightweight; we still validate in nodes via `agentStateSchema`.
  messages: z.any(),
  symbol: z.string().default("AAPL"),
  candles: z.any(),
  indicators: z.any(),
  technicalSignal: z.any(),
  llm: z.any(),
  reply: z.string().default("")
});

export type GraphState = typeof AgentStateSchema.State;

export function createGraph() {
  const model = createModel();

  return new StateGraph(AgentStateSchema)
    .addNode("computeIndicators", async (state: GraphState) => {
      const s = agentStateSchema.parse(state as any);
      return await computeIndicatorsNode(s);
    })
    .addNode("evaluateLLM", async (state: GraphState) => {
      const s = agentStateSchema.parse(state as any);
      return await evaluateLLMNode(s, { model });
    })
    .addNode("decideAction", (state: GraphState) => decideActionNode(agentStateSchema.parse(state as any)))
    .addNode("notify", (state: GraphState) => notifyNode(agentStateSchema.parse(state as any)))
    .addEdge(START, "computeIndicators")
    .addConditionalEdges(
      "computeIndicators",
      (state: GraphState) => {
        const s = agentStateSchema.parse(state as any);
        return s.technicalSignal?.hasPotential ? "evaluateLLM" : "notify";
      },
      { evaluateLLM: "evaluateLLM", notify: "notify" }
    )
    .addEdge("evaluateLLM", "decideAction")
    .addEdge("decideAction", "notify")
    .addEdge("notify", END)
    .compile();
}

