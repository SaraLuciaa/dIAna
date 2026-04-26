import dotenv from "dotenv";
import { z } from "zod";

dotenv.config({ path: ".env.local" });

const envSchema = z.object({
  OPENROUTER_API_KEY: z.string().min(1, 'OPENROUTER_API_KEY is required'),
  OPENROUTER_MODEL: z.string().default('openai/gpt-4o-mini'),
  OPENROUTER_BASE_URL: z.string().url().default('https://openrouter.ai/api/v1'),
  OPENROUTER_TEMPERATURE: z.coerce.number().default(0),
  OPENROUTER_HTTP_REFERER: z.string().url().optional(),
  OPENROUTER_APP_TITLE: z.string().min(1).optional(),
  
  BINANCE_WS_BASE_URL: z.string().default("wss://stream.binance.com:9443"),
  BINANCE_REST_BASE_URL: z.string().default("https://api.binance.com"),
  /** Token del bot de Telegram (BotFather). Opcional: solo requerido para webhook/bot. */
  TELEGRAM_BOT_TOKEN: z.string().min(1).optional(),
  /**
   * Ruta HTTP donde Telegram enviará updates (debe coincidir con el webhook).
   * Ej: `/api/telegram/webhook`
   */
  TELEGRAM_WEBHOOK_PATH: z.string().default("/api/telegram/webhook"),
  /**
   * Secreto opcional para verificar el header `X-Telegram-Bot-Api-Secret-Token` (y `secret_token` en setWebhook).
   * Recomendado en producción.
   */
  TELEGRAM_WEBHOOK_SECRET: z.string().min(8).optional(),
  /**
   * Base pública https (sin trailing slash) para armar el webhook.
   * Ej: `https://abc123.ngrok-free.app` o `https://tu-dominio.com`
   */
  TELEGRAM_PUBLIC_BASE_URL: z.string().url().optional(),
  CHAT_API_PORT: z.coerce.number().int().positive().default(3001),
  /** Si true, el POST /api/chat con el mismo efecto que `debug: true` incluye `trace` en la respuesta (y stderr en CLI con --trace). */
  AGENT_TRACE: z
    .preprocess((v) => {
      if (v === undefined || v === null || v === "") {
        return false;
      }
      if (typeof v === "boolean") {
        return v;
      }
      return /^(1|true|yes)$/i.test(String(v).trim());
    }, z.boolean())
    .default(false),
});

export type AppEnv = z.infer<typeof envSchema>;

export function getEnv(): AppEnv {
  return envSchema.parse(process.env);
}
