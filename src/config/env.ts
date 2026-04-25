import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config({ path: 'env.local' });

const envSchema = z.object({
  OPENROUTER_API_KEY: z.string().min(1, 'OPENROUTER_API_KEY is required'),
  OPENROUTER_MODEL: z.string().default('openai/gpt-4o-mini'),
  OPENROUTER_BASE_URL: z.string().url().default('https://openrouter.ai/api/v1'),
  OPENROUTER_TEMPERATURE: z.coerce.number().default(0),
  OPENROUTER_HTTP_REFERER: z.string().url().optional(),
  OPENROUTER_APP_TITLE: z.string().min(1).optional(),
  CHAT_API_PORT: z.coerce.number().int().positive().default(3001),
  STORE_BASE_URL: z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? undefined : v),
    z.string().url().optional()
  ),
  STORE_TIMEOUT_MS: z.coerce.number().int().positive().default(12_000),
  STORE_MAX_RESPONSE_CHARS: z.coerce.number().int().positive().default(48_000),
  /** Máximo de GET extra al seguir xlink:href en respuestas XML PrestaShop (misma tienda). */
  STORE_XLINK_MAX_FOLLOWS: z.coerce.number().int().positive().default(30),
  STORE_WS_KEY: z.string().optional(),
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
