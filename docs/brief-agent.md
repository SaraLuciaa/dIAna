# Brief del agente dIAna (Oportunidades de Mercado)

## 1. Título de la tarea

Desarrollar y mantener un **agente inteligente** en español, con propósito **educativo**, enfocado en la **detección de oportunidades de mercado tradicionales** usando análisis técnico (inicialmente **RSI** y **MACD**) con datos en tiempo real vía **WebSockets**.

El agente se expone mediante **CLI** y **API HTTP**, y está diseñado para ser extensible hacia alertas automáticas y backtesting.

---

## 2. Contexto

El repositorio **diana** combina un fuerte componente **educativo** (LangChain/LangGraph, arquitectura por capas, TypeScript limpio) con un caso de uso práctico: identificar posibles oportunidades de mercado a partir de datos públicos, aplicando indicadores técnicos y evaluación razonada por LLM.

**Evolución actual del proyecto:**

- Se está migrando de un agente conversacional simple a un **sistema reactivo** basado en **LangGraph**.
- Se prioriza el uso de **WebSockets** para recibir datos de mercado en tiempo real sin polling innecesario.
- El núcleo ya no depende solo de herramientas conversacionales, sino de una arquitectura por capas: **Data → Indicators → Analysis (LLM) → Alerts**.
- Inicialmente se enfoca en **RSI (14)** y **MACD (12,26,9)** como indicadores técnicos principales.
- El LLM **no calcula indicadores**, solo interpreta señales estructuradas generadas por código.

**Qué existe hoy (estado anterior):**
- Consola y API HTTP con memoria de sesión en RAM.
- Herramientas básicas de market data para Binance.
- Agente basado en LangChain clásico.

**Dirección actual:**
- WebSocket-first (Finnhub recomendado para mercados tradicionales, Binance para crypto).
- Cálculo de indicadores con librería dedicada (`trading-signals`).
- Orquestación con **LangGraph** (stateful, con nodos y edges condicionales).
- Invocación del LLM solo cuando existe una señal técnica potencial (para optimizar costo y latencia).

---

## 3. Requerimientos del proyecto

### Lenguaje y Stack

- **TypeScript + Node.js (ESM)**
- **LangGraph** + LangChain.js (para flujos stateful y reactivos)
- **OpenRouter** como proveedor del modelo (`ChatOpenAI` compatible)
- **Express** para la API HTTP (chat y posible dashboard)
- **Zod** para validación de entorno y estado
- WebSocket client para datos de mercado
- Librería de indicadores: `trading-signals` (recomendada)

### Arquitectura Principal

- **Data Layer**: Conexión WebSocket + `CandleBuffer` por símbolo.
- **Indicators Layer**: Cálculo eficiente de RSI y MACD (solo al cerrar velas).
- **Analysis Layer**: LangGraph que orquesta:
  - Cómputo de indicadores
  - Filtro técnico inicial
  - Evaluación con LLM (señal estructurada → decisión con confianza y razonamiento)
- **Alert Layer**: Generación y envío de notificaciones.
- **Storage Layer** (futuro): Persistencia de señales históricas.

### Comportamiento del Agente

- Monitorea símbolos configurados en tiempo real vía WebSocket.
- Calcula indicadores técnicos de forma determinista.
- Solo invoca al LLM cuando detecta una señal técnica potencial (RSI sobrevendido/sobrecomprado o cruce MACD).
- Responde siempre en **español**, con tono **profesional, didáctico y prudente**.
- Nunca promete resultados ni afirma señales infalibles. Siempre separa **datos objetivos** de **interpretación**.

### Input / Output Esperado

**Input:**
- Preguntas en lenguaje natural en español (CLI o API).
- Datos de mercado recibidos automáticamente vía WebSocket.

**Output:**
- Respuestas claras, educativas y en español.
- Cuando detecta oportunidad: `{ should_alert, action, confidence, reason, risk_level }`
- Explicación didáctica del razonamiento técnico y limitaciones del análisis.

---

## 4. Restricciones

- El LLM **nunca** calcula indicadores técnicos (eso lo hace la capa de Indicators).
- Claridad pedagógica: el código debe ser fácil de entender y modificar.
- Sin asesoría financiera personalizada. Este es un proyecto educativo.
- Memoria de sesión en RAM (para chat conversacional). Persistencia multi-instancia es futura.
- Configuración validada al inicio con Zod (API keys, símbolos a monitorear, umbrales, etc.).
- Uso responsable: siempre recordar que los mercados son impredecibles y este sistema es solo para aprendizaje.

---

## 5. Definition of Done (DoD)

- El brief está alineado con `ARCHITECTURE.md`.
- El sistema usa **WebSockets** para datos en tiempo real.
- Los indicadores RSI y MACD se calculan de forma determinista en la capa correspondiente.
- El LangGraph está implementado con nodos claros (computeIndicators, evaluateLLM, decideAction, notify).
- El LLM se invoca solo en señales pre-filtradas.
- CLI y API HTTP siguen funcionales.
- Toda nueva funcionalidad está documentada.
- El agente responde en español con tono didáctico y prudente.
- Validación de entorno y estado con Zod.
- Pruebas manuales del flujo completo (WebSocket → Indicadores → LLM → Alerta).