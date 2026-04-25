import { runAgent } from "./agent/runAgent.js";

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const traceFlag = argv.includes("--trace");
  const input =
    argv.filter((a) => a !== "--trace").join(" ").trim() ||
    "Ayúdame a explorar oportunidades en BTCUSDT usando velas de 1m: qué datos necesitas ver primero y cómo los interpretarías sin recomendar operar.";

  const { reply, trace, traceWarnings } = await runAgent(input, {
    verbose: traceFlag,
    includeTrace: traceFlag
  });
  console.log("\nRespuesta del agente:\n");
  console.log(reply);
  if (trace && trace.length > 0) {
    console.error("\n--- Trazas (--trace): modelo y herramientas ---\n");
    for (const step of trace) {
      console.error(JSON.stringify(step));
    }
    if (traceWarnings && traceWarnings.length > 0) {
      console.error("\n--- Avisos ---\n" + traceWarnings.join("\n"));
    }
  }
}

main().catch((error) => {
  console.error("Error ejecutando el agente:", error);
  process.exit(1);
});
