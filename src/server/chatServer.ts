import { AIMessage, HumanMessage, type BaseMessage } from "@langchain/core/messages";
import cors from "cors";
import express from "express";
import { runAgent as defaultRunAgent, type RunAgentResult } from "../agent/runAgent.js";
import { getEnv } from "../config/env.js";

const MAX_SESSION_MESSAGES = 20;

function trimSession(msgs: BaseMessage[]): BaseMessage[] {
  if (msgs.length <= MAX_SESSION_MESSAGES) {
    return msgs;
  }
  return msgs.slice(-MAX_SESSION_MESSAGES);
}

function toWireMessage(m: BaseMessage): { role: string; content: string } {
  const t = m._getType();
  if (t === "human") {
    return { role: "user", content: String(m.content) };
  }
  if (t === "ai") {
    return { role: "assistant", content: String(m.content) };
  }
  return { role: t, content: String(m.content) };
}

export interface CreateChatAppOptions {
  /** Por defecto devuelve `RunAgentResult`; se admite `string` en tests antiguos. */
  runAgent?: (
    message: string,
    options?: Parameters<typeof defaultRunAgent>[1]
  ) => Promise<RunAgentResult | string>;
}

/**
 * API HTTP para el chat: memoria por `sessionId` en RAM (últimos 20 mensajes).
 */
export function createChatApp(options: CreateChatAppOptions = {}): express.Express {
  const run = options.runAgent ?? defaultRunAgent;
  const sessions = new Map<string, BaseMessage[]>();

  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "64kb" }));
  app.use(
    cors({
      origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
      credentials: true
    })
  );

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  /** Restaura la UI tras recargar: mismo `sessionId` que en sessionStorage. */
  app.get("/api/chat/history", (req, res) => {
    const sessionId =
      typeof req.query?.sessionId === "string" ? req.query.sessionId.trim() : "";
    if (!sessionId) {
      res.status(400).json({ error: "sessionId es obligatorio" });
      return;
    }
    const msgs = trimSession(sessions.get(sessionId) ?? []);
    res.json({ messages: msgs.map(toWireMessage) });
  });

  app.post("/api/chat", async (req, res) => {
    try {
      const sessionId = typeof req.body?.sessionId === "string" ? req.body.sessionId.trim() : "";
      const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";
      if (!sessionId || !message) {
        res.status(400).json({ error: "sessionId y message son obligatorios" });
        return;
      }

      const historyBefore = trimSession(sessions.get(sessionId) ?? []);
      const env = getEnv();
      const debugBody = req.body?.debug === true || req.body?.debug === "true";
      const includeTrace = debugBody || env.AGENT_TRACE;
      const runResult = await run(message, {
        chatHistory: historyBefore,
        verbose: includeTrace,
        includeTrace
      });
      const reply = typeof runResult === "string" ? runResult : runResult.reply;
      const trace = typeof runResult === "string" ? undefined : runResult.trace;
      const traceWarnings =
        typeof runResult === "string" ? undefined : runResult.traceWarnings;

      const historyAfter = trimSession([
        ...historyBefore,
        new HumanMessage(message),
        new AIMessage(reply)
      ]);
      sessions.set(sessionId, historyAfter);

      res.json({
        reply,
        messages: historyAfter.map(toWireMessage),
        ...(includeTrace && trace !== undefined
          ? { trace, ...(traceWarnings && traceWarnings.length > 0 ? { traceWarnings } : {}) }
          : {})
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      res.status(500).json({ error: msg });
    }
  });

  return app;
}

