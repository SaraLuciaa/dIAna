import type { AgentState } from "../state.js";

export function decideActionNode(state: AgentState): Partial<AgentState> {
  const ev = state.llm?.evaluation;
  if (!ev) {
    return {};
  }
  // MVP: la decisión final coincide con evaluación, pero aquí quedaría el umbral/política.
  return {
    llm: {
      ...state.llm,
      evaluation: ev
    }
  };
}

