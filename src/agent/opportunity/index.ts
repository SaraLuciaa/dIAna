export {
  OpportunityEvaluator,
  evaluateOpportunity,
  getDefaultOpportunityEvaluator,
} from "./opportunityEvaluator.js";
export {
  opportunityDecisionSchema,
  opportunitySignalSchema,
  parseDecision,
} from "./decisionSchema.js";
export type { OpportunityDecision, OpportunitySignal } from "./decisionSchema.js";
export {
  applyGuardrails,
  MIN_ALERT_CONFIDENCE,
  MIN_ALERT_STRENGTH_OVERBOUGHT,
  MIN_ALERT_STRENGTH_REVERSAL,
} from "./guardrails.js";
export {
  OPPORTUNITY_EVALUATOR_SYSTEM_PROMPT,
  OPPORTUNITY_EVALUATOR_USER_INSTRUCTION,
} from "./prompt.js";
