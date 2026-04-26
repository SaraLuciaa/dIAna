import { END, START, StateGraph, StateSchema } from "@langchain/langgraph";
import { z } from "zod";
import { createModel } from "./model.js";
import { evaluateLLMNode } from "./nodes/evaluateLLM.js";

const AgentStateSchema = new StateSchema({
  messages: z.any(),
  reply: z.string().default("")
});

export type GraphState = typeof AgentStateSchema.State;

export function createGraph() {
  const model = createModel();

  return new StateGraph(AgentStateSchema)
    .addNode("evaluateLLM", async (state: GraphState) => evaluateLLMNode(state as any, { model }))
    .addEdge(START, "evaluateLLM")
    .addEdge("evaluateLLM", END)
    .compile();
}

