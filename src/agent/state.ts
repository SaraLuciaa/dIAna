import { z } from "zod";

export const agentStateSchema = z.object({
  /** Historia previa (mensajes LangChain) + último input ya incorporado. */
  messages: z.any(),
  /** Respuesta final del asistente. */
  reply: z.string().default("")
});

export type AgentState = z.infer<typeof agentStateSchema>;

