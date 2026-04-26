import type { Bot } from "grammy";
import { runAgent as defaultRunAgent, type RunAgentResult } from "../agent/runAgent.js";
import type { AppEnv } from "../config/env.js";
import { MarketDataService } from "../data/marketDataService.js";
import type { Candle } from "../data/candleBuffer.js";

const CHUNK = 3800;

export function shouldSendProactiveAlert(result: RunAgentResult, debugSendAlways: boolean): boolean {
  if (debugSendAlways) {
    return true;
  }
  const m = result.alertMeta;
  if (!m) {
    return false;
  }
  if (!m.hasPotential) {
    return false;
  }
  if (m.shouldAlert === null) {
    return true;
  }
  return m.shouldAlert === true;
}

export async function sendLongTelegramMessage(bot: Bot, chatId: string, text: string): Promise<void> {
  if (text.length <= CHUNK) {
    await bot.api.sendMessage(chatId, text);
    return;
  }
  for (let i = 0; i < text.length; i += CHUNK) {
    await bot.api.sendMessage(chatId, text.slice(i, i + CHUNK));
  }
}

export interface ProactiveLoopHandle {
  stop: () => void;
}

type RunFn = (
  message: string,
  options?: Parameters<typeof defaultRunAgent>[1]
) => Promise<RunAgentResult | string>;

/**
 * Suscribe Binance klines; en cada vela cerrada corre el agente y puede enviar el resultado a Telegram.
 */
export function startProactiveAlertLoop(options: {
  bot: Bot;
  env: AppEnv;
  runAgent?: RunFn;
}): ProactiveLoopHandle | null {
  const { bot, env } = options;
  const run = options.runAgent ?? defaultRunAgent;
  if (!env.TELEGRAM_BOT_TOKEN) {
    return null;
  }
  if (!env.TELEGRAM_ALERT_CHAT_ID) {
    return null;
  }
  const symbol = env.ALERT_DEFAULT_SYMBOL.trim().toUpperCase();
  if (!symbol) {
    return null;
  }

  let inFlight = false;
  const mds = new MarketDataService({
    provider: "binance",
    binanceBaseUrl: env.BINANCE_WS_BASE_URL,
    binanceKlineInterval: env.ALERT_KLINE_INTERVAL,
    onCandleClose: (sym: string, _c: Candle) => {
      if (sym.toUpperCase() !== symbol) {
        return;
      }
      void (async () => {
        if (inFlight) {
          return;
        }
        inFlight = true;
        const input = `Vela cerrada, analizar ${symbol} (${env.ALERT_KLINE_INTERVAL})`;
        try {
          const runResult = await run(input, { includeAlertMeta: true, chatHistory: [] });
          if (typeof runResult === "string") {
            if (env.ALERT_DEBUG_SEND_ALWAYS) {
              await sendLongTelegramMessage(bot, env.TELEGRAM_ALERT_CHAT_ID!, runResult);
            }
            return;
          }
          if (!shouldSendProactiveAlert(runResult, env.ALERT_DEBUG_SEND_ALWAYS)) {
            return;
          }
          await sendLongTelegramMessage(bot, env.TELEGRAM_ALERT_CHAT_ID!, runResult.reply);
        } catch (e) {
          console.error("[proactiveAlertLoop]", e);
        } finally {
          inFlight = false;
        }
      })();
    }
  });

  mds.connect();
  mds.subscribe(symbol);

  const onSig = (): void => {
    mds.disconnect();
    process.exit(0);
  };
  process.once("SIGINT", onSig);

  return {
    stop: () => {
      process.removeListener("SIGINT", onSig);
      mds.disconnect();
    }
  };
}
