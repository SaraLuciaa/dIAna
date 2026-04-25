import { ChatPromptTemplate } from "@langchain/core/prompts";
import type { ChatOpenAI } from "@langchain/openai";
import { createModel } from "../model.js";
import {
  opportunityDecisionSchema,
  opportunitySignalSchema,
  parseDecision,
  type OpportunityDecision,
  type OpportunitySignal,
} from "./decisionSchema.js";
import { applyGuardrails } from "./guardrails.js";
import {
  OPPORTUNITY_EVALUATOR_SYSTEM_PROMPT,
  OPPORTUNITY_EVALUATOR_USER_INSTRUCTION,
} from "./prompt.js";

const FALLBACK_DECISION: OpportunityDecision = {
  should_alert: false,
  confidence: 0,
  priority: "low",
  message: "Evaluation failed or returned invalid data; defaulting to no alert.",
  reasoning: [
    "Structured LLM output was missing or did not match the expected schema.",
  ],
};

export class OpportunityEvaluator {
  private readonly runStructured: (signalJson: string) => Promise<unknown>;

  constructor(model?: ChatOpenAI) {
    const m = model ?? createModel();
    const structured = m.withStructuredOutput(opportunityDecisionSchema, {
      name: "opportunity_evaluation",
    });
    const prompt = ChatPromptTemplate.fromMessages([
      ["system", OPPORTUNITY_EVALUATOR_SYSTEM_PROMPT],
      ["human", OPPORTUNITY_EVALUATOR_USER_INSTRUCTION],
    ]);
    const chain = prompt.pipe(structured);
    this.runStructured = (signalJson: string) =>
      chain.invoke({ signal_json: signalJson });
  }

  async evaluate(signal: OpportunitySignal): Promise<OpportunityDecision> {
    const parsedSignal = opportunitySignalSchema.safeParse(signal);
    if (!parsedSignal.success) {
      return {
        ...FALLBACK_DECISION,
        reasoning: [
          "Input signal failed schema validation.",
          ...parsedSignal.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
        ].slice(0, 10),
      };
    }

    const payload = JSON.stringify(parsedSignal.data, null, 2);
    try {
      const raw = await this.runStructured(payload);
      const coerced = parseDecision(raw) ?? FALLBACK_DECISION;
      return applyGuardrails(parsedSignal.data, coerced);
    } catch {
      return FALLBACK_DECISION;
    }
  }
}

let defaultEvaluator: OpportunityEvaluator | null = null;

export function getDefaultOpportunityEvaluator(): OpportunityEvaluator {
  if (!defaultEvaluator) defaultEvaluator = new OpportunityEvaluator();
  return defaultEvaluator;
}

/** Convenience: uses shared model from env. */
export async function evaluateOpportunity(
  signal: OpportunitySignal,
): Promise<OpportunityDecision> {
  return getDefaultOpportunityEvaluator().evaluate(signal);
}
