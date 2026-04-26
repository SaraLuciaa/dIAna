# Plan detallado para construir y fortalecer el agente dIAna

## 1. Objetivo del plan

Consolidar **dIAna**: un **agente inteligente de oportunidades de mercado** en español, con fuerte base **didáctica y educativa**, construido sobre **TypeScript + Node.js + LangGraph + OpenRouter**.

El agente debe:

- Detectar posibles oportunidades de mercado usando **análisis técnico** (inicialmente **RSI 14** y **MACD 12,26,9**).
- Recibir datos de mercado en **tiempo real vía WebSockets** (sin polling innecesario).
- Calcular indicadores de forma determinista y eficiente.
- Usar un **LLM** solo para interpretar señales estructuradas y generar razonamiento prudente.
- Exponerse tanto por **CLI** como por **API HTTP** (con memoria de sesión en RAM).
- Mantener una arquitectura limpia por capas y documentación actualizada.

---

## 2. Principios de ejecución

1. **Claridad pedagógica**: el código y el agente deben ser fáciles de entender y modificar.
2. **Separación estricta de responsabilidades**: el LLM nunca calcula indicadores; solo evalúa señales estructuradas.
3. **Eficiencia**: WebSocket + cálculo de indicadores en código + invocación del LLM solo en señales potenciales.
4. **Cambios pequeños e iterativos**: implementar, probar (manual o automatizado) y documentar.
5. **Un solo núcleo**: tanto la CLI como la API reutilizan la misma lógica (`runAgent` / LangGraph).
6. **Documentación alineada**: `brief-agent.md`, `architecture.md` y este plan deben reflejar siempre el estado real del código.
7. **Tono prudente**: nunca prometer resultados, siempre separar datos objetivos de interpretación.

---

## 3. Alcance funcional actual

### Incluye

- Conexión a datos de mercado vía **WebSocket** (Finnhub recomendado).
- Buffer de velas por símbolo (`CandleBuffer`).
- Cálculo de **RSI** y **MACD** en la capa de Indicators (`trading-signals`).
- Orquestación con **LangGraph** (nodos: computeIndicators, evaluateLLM, decideAction, notify).
- Evaluación estructurada del LLM (`should_alert`, `action`, `confidence`, `reason`, `risk_level`).
- CLI y API HTTP con memoria de sesión en RAM.
- Respuestas siempre en **español**, tono profesional y didáctico.
- Validación centralizada de entorno con Zod.

### No incluye (por ahora)

- Ejecución automática de órdenes o integración con brokers.
- Persistencia durable de señales o sesiones (queda en RAM).
- Análisis multi-timeframe completo.
- Backtesting automático.
- Dashboard web avanzado.
- Multi-agente (Risk Manager, News Analyst, etc.).
- Autenticación o sistema de usuarios.

---

## 4. Plan por fases

### Fase 0: Alineación y preparación (Actual)

**Objetivo:** Tener toda la documentación y visión alineada con la nueva arquitectura.

**Actividades:**
- Actualizar `brief-agent.md`, `architecture.md` y este `plan-agent.md`.
- Definir símbolos iniciales a monitorear y umbrales de RSI/MACD.
- Inventario actual del código vs nueva estructura de carpetas propuesta.

**Entregables:** Documentación actualizada + decisión clara de API WebSocket principal (Finnhub o Binance).

**Criterio de salida:** Todos los documentos están coherentes entre sí.

### Fase 1: Data Layer + WebSocket (Prioridad alta)

**Objetivo:** Recibir datos de mercado en tiempo real de forma eficiente.

**Actividades:**
- Implementar `MarketDataService` con WebSocket.
- Crear `CandleBuffer` (buffer circular de velas OHLCV por símbolo).
- Conectar a Finnhub (o Binance) y suscribirse a velas (kline/candle updates).
- Normalizar datos entrantes a formato estándar.

**Criterio de salida:** Se pueden recibir velas en tiempo real y mantener buffer actualizado por símbolo.

### Fase 2: Indicators Layer

**Objetivo:** Cálculo confiable y eficiente de indicadores técnicos.

**Actividades:**
- Instalar y configurar `trading-signals`.
- Implementar cálculo de **RSI(14)** y **MACD(12,26,9)**.
- Crear funciones que calculen indicadores solo cuando se cierra una vela.
- Añadir detección básica de señales técnicas (cruce MACD, niveles de RSI).

**Criterio de salida:** Los indicadores se calculan correctamente a partir del buffer de velas.

### Fase 3: Analysis Layer - LangGraph

**Objetivo:** Migrar a una orquestación moderna y reactiva.

**Actividades:**
- Definir el estado del graph (`agent/state.ts`).
- Crear nodos: `computeIndicators`, `evaluateLLM`, `decideAction`, `notify`.
- Implementar flujo condicional (solo invocar LLM si hay señal técnica potencial).
- Actualizar `createGraph.ts` y `runAgent.ts`.

**Criterio de salida:** El LangGraph completo procesa una vela → indicadores → evaluación LLM → decisión.

### Fase 4: Alertas y Salida

**Objetivo:** Generar valor usable.

**Actividades:**
- Implementar nodo de decisión y generación de alertas.
- Añadir canales de notificación (Telegram y/o Discord como mínimo).
- Mejorar prompt del LLM para respuestas didácticas y estructuradas.
- Actualizar CLI y API para mostrar señales y alertas.

**Criterio de salida:** El sistema genera alertas claras cuando detecta oportunidades.

### Fase 5: Pruebas, Calidad y Documentación

**Objetivo:** Sistema confiable y fácil de mantener.

**Actividades:**
- Añadir tests unitarios para indicadores y buffer.
- Tests de integración para WebSocket (con mocks).
- Actualizar README, guías de desarrollo y ejemplos.
- Preparar scripts de arranque claros (`npm run dev`, `npm run start:cli`, etc.).

**Criterio de salida:** Nueva persona puede clonar, configurar y ejecutar el proyecto sin problemas.

---

## 5. Cronograma sugerido (iterativo)

- **Semana 1:** Fase 0 + Fase 1 (WebSocket + Buffer)
- **Semana 2:** Fase 2 (Indicators Layer)
- **Semana 3:** Fase 3 (LangGraph completo)
- **Semana 4:** Fase 4 (Alertas) + Fase 5 (Pruebas y docs)

---

## 6. Definition of Done (DoD)

- La documentación (`brief-agent.md`, `architecture.md`, `plan-agent.md`) está actualizada y coherente.
- El sistema usa **WebSockets** para datos en tiempo real.
- RSI y MACD se calculan correctamente en la capa de Indicators.
- El LangGraph procesa el flujo completo de forma eficiente.
- El LLM se invoca solo cuando hay señales técnicas potenciales.
- CLI y API HTTP siguen funcionales y devuelven respuestas en español.
- Todo cambio importante está documentado.
- El tono del agente es profesional, didáctico y prudente.

---

## 7. Riesgos y mitigaciones

- **Costo de LLM**: Mitigar invocando el modelo solo en señales pre-filtradas.
- **Latencia del WebSocket**: Usar buffers eficientes y backpressure.
- **Complejidad de LangGraph**: Empezar con graph simple y añadir complejidad gradualmente.
- **Precisión de indicadores**: Validar cálculos contra librerías conocidas y datos históricos.
- **Alucinaciones del LLM**: Prompt muy estricto + salida estructurada con parser.
- **Dependencia de APIs externas**: Tener fallback o mocks para desarrollo.

---

## 8. Próximos pasos inmediatos

1. Finalizar la actualización de los tres documentos (brief, architecture y plan).
2. Decidir API WebSocket principal (Finnhub vs Binance) y obtener keys.
3. Iniciar Fase 1: Implementar `MarketDataService` y `CandleBuffer`.
4. Revisar y aprobar la nueva estructura de carpetas propuesta en `architecture.md`.
