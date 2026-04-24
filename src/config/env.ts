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
  STORE_WS_KEY: z.string().optional(),
});

export type AppEnv = z.infer<typeof envSchema>;

export function getEnv(): AppEnv {
  return envSchema.parse(process.env);
}
