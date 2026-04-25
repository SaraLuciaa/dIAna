import type { OpportunityDecision, OpportunitySignal } from "./decisionSchema.js";

/**
 * Rule-engine strength floors by signal family (MVP scoring uses 3 slots:
 * overbought ≈ 1/3, reversal ≈ 2/3).
 */
export const MIN_ALERT_STRENGTH_OVERBOUGHT = 0.32;
export const MIN_ALERT_STRENGTH_REVERSAL = 0.55;

function minStrengthForAlert(signal: OpportunitySignal): number {
  return signal.type === "overbought"
    ? MIN_ALERT_STRENGTH_OVERBOUGHT
    : MIN_ALERT_STRENGTH_REVERSAL;
}

/** If the model wants an alert but confidence is below this, suppress (hallucination / over-enthusiasm guard). */
export const MIN_ALERT_CONFIDENCE = 0.45;

export function applyGuardrails(
  signal: OpportunitySignal,
  decision: OpportunityDecision,
): OpportunityDecision {
  let d: OpportunityDecision = {
    ...decision,
    confidence: clamp01(decision.confidence),
    message: decision.message.slice(0, 500),
    reasoning: decision.reasoning.slice(0, 10).map((s) => s.slice(0, 400)),
  };

  if (!d.should_alert) {
    return { ...d, priority: "low" };
  }

  const reasons: string[] = [];

  const minS = minStrengthForAlert(signal);
  if (signal.strength < minS) {
    reasons.push(
      `Rule-engine strength (${signal.strength.toFixed(2)}) is below the minimum (${minS}) for this signal type.`,
    );
    d = { ...d, should_alert: false, priority: "low" };
  }

  if (d.should_alert && d.confidence < MIN_ALERT_CONFIDENCE) {
    reasons.push(
      `Model confidence (${d.confidence.toFixed(2)}) is below the minimum (${MIN_ALERT_CONFIDENCE}) for alerts.`,
    );
    d = { ...d, should_alert: false, priority: "low" };
  }

  if (reasons.length > 0) {
    d = {
      ...d,
      message:
        d.should_alert
          ? d.message
          : "Alert suppressed after automated quality checks.",
      reasoning: [...reasons, ...d.reasoning].slice(0, 10),
    };
  }

  return d;
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}
