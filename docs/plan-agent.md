# Plan detallado para construir y fortalecer la aplicación del agente

## 1. Objetivo del plan

Consolidar **dIAna** (**diana**): agente de **mercado** (oportunidades / lectura) en español, con base didáctica, sobre **TypeScript + Node.js + LangChain + OpenRouter**, que:

- responda con claridad en lenguaje natural (lectura de contexto, hipótesis, riesgos, siguientes pasos);
- pueda usar **tools** cuando aporten valor (hoy: **market data** MVP vía `market_data_*`);
- exponga la misma lógica por **consola** y por **API HTTP** (chat con `sessionId` e historial en RAM);
- mantenga arquitectura por capas y documentación alineada con `docs/brief-agent.md`;
- avance hacia **pruebas automatizadas** y scripts de arranque fiables.

---

## 2. Principios de ejecución

1. **Claridad pedagógica:** flujo entendible; no inventar “hechos” de mercado sin evidencia (datos del usuario o salida de tools).
2. **Cambios pequeños y verificables:** ejecutar, probar (manual o test) y documentar.
3. **Capas definidas:** entrada, ejecución con historial, composición del agente, herramientas, configuración.
4. **Un solo núcleo de agente:** CLI y servidor reutilizan `runAgent` / `buildAgentExecutor`.
5. **Documentar** cambios de comportamiento, API y variables de entorno.
6. **No romper** consola ni contrato del API sin actualizar cliente y docs.

---

## 3. Alcance funcional

### Incluye

- Entrada por **consola** y por **API** (`sessionId`, `message`, respuesta con `reply` e historial recortado).
- Respuestas en **español** alineadas al rol de mercado definido en `prompt.ts`.
- Validación de configuración al arrancar (OpenRouter, puerto del chat, etc.).
- Endpoints según `src/chatServer.ts`; cliente de prueba en `web/`.
- Market data MVP en `src/marketData/*` + tools `market_data_*` en `src/agent/tools/marketData.ts`.

### No incluye (salvo decisión explícita)

- Motor de señales/indicadores, ejecución de órdenes, riesgo, portfolio, etc.
- Orquestación multiagente.
- Persistencia durable de sesiones en base de datos.
- Autenticación, facturación o paneles de administración.
- Streaming de tokens (mejora futura opcional).

---

## 4. Plan por fases

### Fase 0: Alineación y línea base

**Objetivo:** contexto compartido y escenarios de prueba realistas para lectura de mercado (MVP con velas 1m).

**Actividades:**

- Revisar `brief-agent.md` y `architecture.md` frente al código.
- Inventario: CLI, API, herramientas en `createAgent.ts`, `env.example` vs `getEnv`.
- Escenarios prioritarios: conversación sin herramientas, uso de market data (subscribe → recent → unsubscribe), dos turnos en API con el mismo `sessionId`.

**Entregables:** resumen de estado y lista de escenarios.

**Criterio de salida:** el equipo entiende alcance **mercado + tools actuales (market data MVP)**.

---

### Fase 1: Arquitectura y operación local

**Objetivo:** arranque sin fricción y responsabilidades claras.

**Actividades:**

- Confirmar mapa: `src/index.ts`, `chatServer.ts`, `serverListen.ts`, `runAgent.ts`, `createAgent.ts`, `config/env.ts`, `agent/tools/*`.
- Alinear `package.json` (dev/start/build) con el entrypoint real del servidor.
- Guía corta para añadir una herramienta nueva (registro, prompt, env si aplica).

**Criterio de salida:** cualquiera ubica en minutos dónde cambiar HTTP, agente o configuración.

---

### Fase 2: Comportamiento del agente de mercado

**Objetivo:** tono y decisiones de herramientas acertadas.

**Actividades:**

- Revisar `prompt.ts`: no inventar datos; cuándo usar `market_data_*`.
- Validar escenarios: solo marco conceptual, lectura de velas, combinado.
- Ajustar prompt solo con evidencia de fallos repetidos.

**Criterio de salida:** respuestas útiles, en español, sin prometer condiciones no dichas por el usuario.

---

### Fase 3: API, cliente y configuración

**Objetivo:** contrato explícito y cliente de prueba coherente.

**Actividades:**

- Documentar `POST /api/chat`, `GET /api/chat/history`, `GET /api/health` y límites (cuerpo, 20 mensajes).
- Alinear `web/index.html` con el JSON real (`sessionId`, `message`, `reply`).
- Sincronizar `env.example` con `getEnv` (OpenRouter, `CHAT_API_PORT`, etc.).

**Criterio de salida:** flujo “servidor + web + sesión” funciona sin adivinar el formato.

---

### Fase 4: Pruebas y calidad

**Objetivo:** ampliar cobertura más allá de los tests existentes (hoy hay tests de normalización de velas).

**Actividades:** runner (Vitest o Node test), tests de `getEnv`, utilidades de herramientas, opcional `supertest` con `runAgent` mockeado.

**Criterio de salida:** regresiones detectables por tests en el alcance cubierto.

---

### Fase 5: Documentación y handoff

**Objetivo:** README y docs coherentes; roadmap incremental (más timeframes, order book, persistencia, backtesting, etc.).

**Criterio de salida:** una persona nueva puede ejecutar y extender el proyecto.

---

## 5. Cronograma sugerido (iterativo)

- **Semana 1:** Fase 0 + Fase 1  
- **Semana 2:** Fase 2  
- **Semana 3:** Fase 3  
- **Semana 4:** Fase 4 + Fase 5  

---

## 6. Definition of Done operativa

- Comportamiento acorde a **agente de mercado** y español claro.
- Casos prioritarios: market data, mixtos, conversación sin herramientas.
- CLI y API documentados; `web/` alineado.
- `env.example` y README coherentes con `getEnv`.
- Brief, plan y arquitectura reflejan el repositorio.

---

## 7. Riesgos y mitigaciones

- **Alucinaciones / sobrecerteza:** mitigar con prompt explícito y separar **hechos** (velas) de **interpretación**.
- **Tools de market data mal usadas:** mitigar con descripciones de tool, límites de buffer y pruebas manuales (fugas de WS, suscripciones olvidadas).
- **Memoria solo en RAM:** documentar; roadmap si hace falta persistencia.
- **Regresiones en API:** tests de contrato / mocks.
- **Docs vs código:** Fase 0 y revisión al cerrar cada entrega.

---

## 8. Próximos pasos

1. Fase 0 en una sesión corta (demo CLI + API).  
2. Fase 1: scripts y README.  
3. Fase 2 y 3 en paralelo con cuidado en el contrato del API.  
4. Registrar decisiones de producto y de prompt.  
