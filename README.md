# dIAna / diana (market opportunities agent + Binance market data MVP)

Monorepo pequeño en **TypeScript (ESM)** con:

- **Agente LangChain** expuesto por **CLI** y **API HTTP** (Express).
- **Market data MVP**: WebSocket Binance (kline 1m) + normalización a `NormalizedCandle`.
- **Tools del agente** para controlar suscripciones y leer un buffer en RAM (MVP).

## Qué archivos son “útiles” (núcleo)

### Agente + servidor

- `src/agent/createAgent.ts`: compone `ReactAgent` (modelo + tools + prompt).
- `src/agent/runAgent.ts`: punto único de ejecución (CLI + servidor).
- `src/agent/prompt.ts`: instrucciones de sistema (debe mencionar solo tools reales).
- `src/agent/model.ts`: configuración del modelo (OpenRouter).
- `src/agent/agentTrace.ts`: tracing opcional.
- `src/agent/tools/marketData.ts`: **LangChain tools** de market data (subscribe/unsubscribe/recent).

- `src/chatServer.ts`: API Express (chat + health + historial en RAM).
- `src/serverListen.ts`: arranque del servidor.
- `src/index.ts`: CLI del agente.

- `src/config/env.ts`: carga `env.local` + validación Zod.

### Market data

- `src/marketData/binanceKlineStream.ts`: **solo transporte** (WS + reconnect) y delega normalización.
- `src/marketData/binanceKlineHub.ts`: **MVP hub** (1 suscripción por símbolo + ring buffer) para consumo vía tools.
- `src/marketData/normalization/*`: **normalización** multi-proveedor (hoy: Binance).
- `src/marketData/types.ts`: contrato `NormalizedCandle`.
- `src/marketData/asyncQueue.ts`: cola async (útil si consumes `stream()` del WS directamente).
- `src/marketData/example.ts`: ejemplo/manual smoke del WS (no es núcleo del producto).

### Cliente web

- (Opcional) Si agregas una UI estática, colócala bajo `web/` y documenta el flujo. Hoy el foco es **CLI + API**.

### Documentación

- `docs/architecture.md`: arquitectura (debe mantenerse alineada al código).
- `docs/brief-agent.md`, `docs/plan-agent.md`: brief/plan (pueden quedar más “producto”; evitar afirmar features inexistentes).

## Qué archivos normalmente NO debes tratar como “fuente”

- `node_modules/`: dependencias (regenerable).
- `dist/`: salida de `tsc` (regenerable; está ignorada por git en `.gitignore`).
- `package-lock.json`: lockfile (importante para reproducibilidad, pero no es código de dominio).

## Scripts

Ver `package.json`. Los más usados:

- `npm run dev:server`: API en caliente (`tsx watch`).
- `npm run cli`: consola del agente.
- `npm run dev:marketdata -- BTCUSDT`: smoke del stream (stdout/stderr).
- `npm test`: tests (`src/**/*.test.ts`).
- `npm run build`: compila a `dist/`.

## Entorno

Copia `env.example` → `env.local` y completa al menos `OPENROUTER_API_KEY`.

## Market data: flujo recomendado (MVP)

1. El agente llama `market_data_subscribe_binance_kline_1m` para un símbolo.
2. Luego puede llamar `market_data_recent_candles` para leer el buffer.
   - Si omites `only_closed`, la tool devuelve un **preview mixto** (útil para lenguaje natural).
3. Si necesitas “que lleguen N velas” en una sola corrida (CLI), usa `market_data_wait_for_candles` (bloquea hasta timeout).
4. Cuando termine, `market_data_unsubscribe_binance_kline_1m` para liberar el socket.

## Tests

Hoy hay tests de normalización en:

- `src/marketData/normalization/normalizeCandle.test.ts`
