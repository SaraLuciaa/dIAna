import { getEnv } from "../config/env.js";

function normalizeBaseUrl(u: string): string {
  return u.replace(/\/+$/, "");
}

async function main(): Promise<void> {
  const env = getEnv();
  if (!env.TELEGRAM_BOT_TOKEN) {
    throw new Error("TELEGRAM_BOT_TOKEN no está definido en .env.local");
  }
  if (!env.TELEGRAM_PUBLIC_BASE_URL) {
    throw new Error("TELEGRAM_PUBLIC_BASE_URL no está definido (debe ser https://... sin slash final)");
  }

  const base = normalizeBaseUrl(env.TELEGRAM_PUBLIC_BASE_URL);
  const path = env.TELEGRAM_WEBHOOK_PATH.startsWith("/")
    ? env.TELEGRAM_WEBHOOK_PATH
    : `/${env.TELEGRAM_WEBHOOK_PATH}`;
  const url = `${base}${path}`;

  const res = await fetch(`https://api.telegram.org/bot${encodeURIComponent(env.TELEGRAM_BOT_TOKEN)}/setWebhook`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      url,
      allowed_updates: ["message"],
      secret_token: env.TELEGRAM_WEBHOOK_SECRET
    })
  });
  const data = (await res.json().catch(() => ({}))) as { ok?: boolean; description?: string };
  if (!res.ok || data.ok === false) {
    throw new Error(`setWebhook falló: HTTP ${res.status} ${data.description ?? ""}`.trim());
  }

  console.log(`[telegram] setWebhook ok → ${url}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
