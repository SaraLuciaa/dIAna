import type { AgentState } from "../state.js";

function fmt(n: number | null | undefined, digits = 2): string {
  if (typeof n !== "number" || !Number.isFinite(n)) return "n/a";
  return n.toFixed(digits);
}

export function notifyNode(state: AgentState): Partial<AgentState> {
  const sym = state.symbol ?? "AAPL";
  const tf = state.candles?.timeframe ?? "15m";
  const count = state.candles?.count ?? 0;
  const lastT = state.candles?.lastCandleTime ? new Date(state.candles.lastCandleTime).toISOString() : "n/a";

  const rsi = state.indicators?.rsi14 ?? null;
  const macd = state.indicators?.macd ?? null;
  const reasons = state.technicalSignal?.reasons ?? [];
  const hasPotential = state.technicalSignal?.hasPotential ?? false;

  const ev = state.llm?.evaluation;

  const lines: string[] = [];
  lines.push(`Análisis técnico (educativo) para **${sym}** en velas **${tf}**.`);
  lines.push(`- Velas usadas: **${count}** (última: ${lastT})`);
  lines.push(`- RSI(14): **${fmt(rsi, 1)}**`);
  lines.push(
    `- MACD(12,26,9): macd=${fmt(macd?.macd)} signal=${fmt(macd?.signal)} hist=${fmt(macd?.histogram)}`
  );

  if (!hasPotential) {
    lines.push(`\nNo detecté una señal técnica clara para justificar evaluación adicional por LLM en este momento.`);
    lines.push(`Si quieres, dime qué símbolo comparar o qué umbrales prefieres (RSI/MACD) para afinar el filtro.`);
    return { reply: lines.join("\n") };
  }

  lines.push(`\nSeñales que dispararon evaluación:`);
  for (const r of reasons) lines.push(`- ${r}`);

  if (!ev) {
    const pe = state.llm?.parseError ? ` (${state.llm.parseError})` : "";
    lines.push(`\nNo pude obtener una evaluación estructurada del LLM${pe}.`);
    lines.push(`Puedes reintentar o pedirme que ajuste el prompt/validador.`);
    return { reply: lines.join("\n") };
  }

  lines.push(`\nEvaluación (LLM, educativa):`);
  lines.push(`- should_alert: **${ev.should_alert}**`);
  lines.push(`- action: **${ev.action}**`);
  lines.push(`- confidence: **${fmt(ev.confidence, 2)}**`);
  lines.push(`- risk_level: **${ev.risk_level}**`);
  lines.push(`- reason: ${ev.reason}`);

  return { reply: lines.join("\n") };
}

