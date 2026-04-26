# Arquitectura del Proyecto - Market Opportunity Agent

Este proyecto implementa un **agente inteligente** orientado a la **detección de oportunidades de mercado tradicionales** (acciones, forex, índices, etc.). Es un **MVP educativo** que combina datos de mercado en tiempo real con análisis técnico (RSI + MACD inicialmente) y evaluación asistida por LLM.

El enfoque principal es **eficiencia y bajo costo**: se utilizan **WebSockets** para recibir datos sin polling innecesario y el LLM solo se invoca cuando hay señales técnicas potenciales.

## Objetivos Principales
- Detectar señales basadas en **RSI (14)** y **MACD (12,26,9)**.
- Evaluar las señales con un LLM para agregar contexto, confianza y razonamiento.
- Minimizar consumo de tokens y latencia.
- Diseñado para ser extensible (multi-timeframe, más indicadores, backtesting, alertas).

## Arquitectura General (Layers)

La arquitectura se divide en capas bien separadas para mantener claridad, testeabilidad y escalabilidad:

- **Data Layer** — Conexión WebSocket, buffering de velas OHLCV y normalización de datos.
- **Indicators Layer** — Cálculo puro y eficiente de indicadores técnicos (sin LLM).
- **Analysis Layer** — Orquestación con **LangGraph** + evaluación con LLM.
- **Alert & Output Layer** — Decisión final, notificaciones y logging.
- **Storage Layer** — Persistencia de señales, histórico y memoria del agente (opcional para MVP).

## Estructura de Carpetas Recomendada

```bash
src/
├── config/                  # Configuración y validación de entorno
│   └── env.ts
├── data/                    # WebSocket y manejo de datos en tiempo real
│   ├── marketDataService.ts
│   ├── candleBuffer.ts
│   └── websocket/
├── indicators/              # Cálculo de indicadores técnicos
│   ├── rsi.ts
│   ├── macd.ts
│   └── index.ts             # Factory o barrel
├── agent/
│   ├── graph.ts             # Definición principal del LangGraph
│   ├── state.ts             # Tipo de estado compartido (Zod)
│   ├── nodes/               # Nodos del graph
│   │   ├── computeIndicators.ts
│   │   ├── evaluateLLM.ts
│   │   ├── decideAction.ts
│   │   └── notify.ts
│   ├── prompts/
│   ├── tools/               # Tools que el agente puede llamar
│   ├── evaluator.ts         # Lógica de evaluación LLM (si se separa)
│   ├── createGraph.ts       # Ensamblaje del graph
│   └── runAgent.ts          # Punto único de ejecución
├── alerts/                  # Notificaciones (Telegram, email, Discord, etc.)
├── storage/                 # Persistencia (SQLite/Prisma para señales históricas)
├── utils/                   # Utilidades generales
└── server/                  # Servidor (opcional: Express/Fastify + WS para dashboard)
```

## Responsabilidades por Módulo

### Configuración y Núcleo
- **`src/config/env.ts`** — Carga `.env.local` y valida con Zod (API keys, símbolos a monitorear, umbrales, etc.).
- **`src/agent/state.ts`** — Define el esquema de estado del LangGraph (símbolo, velas recientes, indicadores calculados, señal técnica, resultado LLM, etc.).
- **`src/agent/graph.ts`** + **`createGraph.ts`** — Construye el flujo con LangGraph (nodos y edges condicionales).

### Data Layer
- **`src/data/marketDataService.ts`** — Gestiona conexiones WebSocket.
- **`src/data/candleBuffer.ts`** — Buffer circular de velas por símbolo (mantener últimas 200-500 velas para cálculos).

### Indicators Layer
- **`src/indicators/`** — Cálculo de **RSI** y **MACD** usando la librería `trading-signals`.
  - No calcula en cada tick → solo al cerrar una vela.
  - Soporta multi-timeframe en el futuro.

### Analysis Layer (Agente)
- **`src/agent/nodes/computeIndicators.ts`** — Nodo que calcula RSI y MACD a partir del buffer.
- **`src/agent/nodes/evaluateLLM.ts`** — Invoca al LLM solo cuando hay señal técnica potencial. 
- **`src/agent/prompts/`** — Prompts claros y estructurados (rol de analista técnico + instrucciones de salida con parser).
- **`src/agent/tools/`** — Tools auxiliares (obtener histórico, consultar noticias básicas, etc.).

### Alert & Output Layer
- Nodo de decisión y envío de alertas.
- Soporte para múltiples canales de notificación.

## Decisiones de Diseño Actualizadas

- **TypeScript ESM** + Node.js moderno.
- **LangGraph** (en lugar de agente simple de LangChain) → flujos stateful, edges condicionales y checkpointing para depuración y recuperación.
- **WebSocket-first**: Datos en tiempo real sin polling.
- **Separación estricta**: El LLM **nunca** calcula indicadores. Solo interpreta señales estructuradas.
- **Eficiencia**: El LLM se invoca solo en señales pre-filtradas por reglas técnicas → bajo costo de tokens.
- **Indicadores**: Calculados con `trading-signals` (streaming, preciso y ligero).
- **Validación centralizada** con Zod para estado y entorno.
- **Inyección de dependencias** para facilitar testing (mocks de WebSocket, LLM, etc.).
- **Streaming support** en LangGraph y LLM para feedback en tiempo real.
- **Extensibilidad**: Fácil añadir más indicadores, multi-timeframe, backtesting y multi-agente (ej. Risk Manager separado).

## Flujo Principal (LangGraph)

1. **WebSocket** recibe nueva vela cerrada → actualiza `candleBuffer`.
2. **Nodo ComputeIndicators** → calcula RSI + MACD.
3. **Filtro técnico** → si hay señal potencial (RSI < 35 o > 65, cruce MACD, etc.) → avanza.
4. **Nodo EvaluateLLM** → LLM analiza señal + contexto → genera evaluación estructurada.
5. **Nodo DecideAction** → aplica umbrales de confianza y genera alerta si corresponde.
6. **Nodo Notify** → envía notificación y persiste la señal.

El graph permite loops (re-evaluación) y branching (hold vs alert).

## Tecnologías Recomendadas
- **Orquestación**: LangGraph.js + LangChain.js
- **Modelo LLM**: OpenRouter
- **Datos en tiempo real**: Finnhub WebSocket 
- **Indicadores**: `trading-signals`
- **Validación**: Zod
- **Persistencia** (futuro): Prisma + SQLite/PostgreSQL
- **Alertas**: Telegram Bot

## Próximos Pasos (Roadmap)
- Implementar WebSocket + Candle Buffer.
- Migrar el agente actual a LangGraph.
- Añadir backtesting con los mismos indicadores.
- Soporte multi-símbolo y multi-timeframe.
- Dashboard web opcional para visualizar señales en vivo.

Esta arquitectura mantiene el espíritu educativo del MVP original pero lo prepara para crecer hacia un sistema más robusto y eficiente en producción.
