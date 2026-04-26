# dIAna (market opportunity agent)

Proyecto educativo en **TypeScript (Node.js ESM)** para explorar oportunidades de mercado con una arquitectura por capas:

- **Data Layer**: ingestión en tiempo real (WebSocket) + buffer de velas.
- **Indicators Layer**: RSI/MACD deterministas (sin LLM).
- **Analysis Layer**: orquestación con **LangGraph** + evaluación con LLM (OpenRouter).
- **Server Layer**: API HTTP (Express) + CLI reutilizando el mismo `runAgent`.

La arquitectura objetivo está documentada en `docs/architecture.md` y el brief del producto en `docs/brief-agent.md`.

## Quickstart

1) Instalar dependencias:

```bash
npm install
```

2) Crear `.env.local` (en la raíz del repo) con al menos:

- `OPENROUTER_API_KEY`

3) Probar por CLI:

```bash
npm run cli
```

Puedes activar trazas con:

```bash
npm run cli -- --trace
```

4) Levantar la API HTTP:

```bash
npm run dev:server
```

Endpoints:

- `GET /api/health`
- `GET /api/chat/history?sessionId=...`
- `POST /api/chat` body: `{ "sessionId": "abc", "message": "..." }` (opcional: `"debug": true` para incluir `trace`)

## Scripts

- **`npm run cli`**: ejecuta el agente por consola (`src/index.ts`).
- **`npm run dev:server`**: API Express en caliente (`src/serverListen.ts`).
- **`npm run build`**: compila TypeScript a `dist/`.
- **`npm run start`**: ejecuta el servidor desde `dist/`.
- **`npm test`**: corre tests (si existen).
- **`npm run dev:marketdata`**: placeholder del Data Layer (`src/data/example.ts`).

## Variables de entorno (`.env.local`)

Definidas/validadas en `src/config/env.ts`:

- **`OPENROUTER_API_KEY`** (requerida)
- **`OPENROUTER_MODEL`** (default: `openai/gpt-4o-mini`)
- **`OPENROUTER_BASE_URL`** (default: `https://openrouter.ai/api/v1`)
- **`OPENROUTER_TEMPERATURE`** (default: `0`)
- **`OPENROUTER_HTTP_REFERER`** (opcional)
- **`OPENROUTER_APP_TITLE`** (opcional)
- **`CHAT_API_PORT`** (default: `3001`)
- **`AGENT_TRACE`** (default: `false`)

## Estructura de carpetas (actual)

```bash
src/
├── config/
│   └── env.ts
├── data/
│   ├── candleBuffer.ts
│   ├── marketDataService.ts
│   └── example.ts
├── indicators/
│   ├── rsi.ts
│   ├── macd.ts
│   └── index.ts
├── agent/
│   ├── createGraph.ts
│   ├── model.ts
│   ├── prompt.ts
│   ├── runAgent.ts
│   ├── state.ts
│   └── nodes/
│       └── evaluateLLM.ts
├── server/
│   ├── chatServer.ts
│   └── serverListen.ts
├── chatServer.ts        # wrapper de compatibilidad
├── serverListen.ts      # wrapper de compatibilidad
└── index.ts             # CLI entrypoint
```

## Estado del MVP (importante)

- El **LangGraph** actual es mínimo: **evalúa el mensaje con el LLM** y devuelve `reply`.
- `src/data/` y `src/indicators/` ya están creados como base, pero la integración “WS → buffer → indicadores → decisión” se completa en iteraciones siguientes.

## Notas

- Este proyecto es **educativo**: no es asesoría financiera ni ejecuta órdenes.
