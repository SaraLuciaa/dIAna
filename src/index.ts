import { runAgent } from "./agent/runAgent.js";

async function main(): Promise<void> {
  const input =
    process.argv.slice(2).join(" ").trim() ||
    "Redacta un mensaje corto de seguimiento comercial para un cliente que pidió cotización y no ha respondido.";

  const output = await runAgent(input, { verbose: true });
  console.log("\nRespuesta del agente:\n");
  console.log(output);
}

main().catch((error) => {
  console.error("Error ejecutando el agente:", error);
  process.exit(1);
});
