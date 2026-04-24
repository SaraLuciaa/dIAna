# Plan detallado para construir y fortalecer la aplicación del agente

## 1. Objetivo del plan

Consolidar **dIAna** (**diana-sales-agent**): agente de **ventas** en español, con base didáctica, sobre **TypeScript + Node.js + LangChain + OpenRouter**, que:

- responda con claridad en lenguaje natural (orientación comercial, borradores, seguimiento);
- use **consulta a la tienda** (`http_get_api_tienda`, HTTP bajo `/api/`) cuando aporte valor;
- exponga la misma lógica por **consola** y por **API HTTP** (chat con `sessionId` e historial en RAM);
- mantenga arquitectura por capas y documentación alineada con `docs/brief-agent.md`;
- avance hacia **pruebas automatizadas** y scripts de arranque fiables.

---

## 2. Principios de ejecución

1. **Claridad pedagógica y comercial:** flujo entendible; no inventar datos de producto ni políticas.
2. **Cambios pequeños y verificables:** ejecutar, probar (manual o test) y documentar.
3. **Capas definidas:** entrada, ejecución con historial, composición del agente, herramientas, configuración.
4. **Un solo núcleo de agente:** CLI y servidor reutilizan `runAgent` / `buildAgentExecutor`.
5. **Documentar** cambios de comportamiento, API y variables de entorno.
6. **No romper** consola ni contrato del API sin actualizar cliente y docs.

---

## 3. Alcance funcional

### Incluye

- Entrada por **consola** y por **API** (`sessionId`, `message`, respuesta con `reply` e historial recortado).
- Respuestas en **español** alineadas al rol de ventas definido en `prompt.ts`.
- Herramientas: **http_get_api_tienda** (catálogo/sistema vía `GET` acotado a `STORE_BASE_URL` + `/api/...`, ver `env.example`).
- Validación de configuración al arrancar (OpenRouter, puerto del chat, etc.).
- Endpoints según `src/chatServer.ts`; cliente de prueba en `web/`.

### No incluye (salvo decisión explícita)

- Búsquedas externas tipo SerpApi, scraping genérico de HTML ni integraciones de inventario o CRM más allá del `GET` acotado a la tienda configurada.
- Orquestación multiagente.
- Persistencia durable de sesiones en base de datos.
- Autenticación, facturación o paneles de administración.
- Streaming de tokens (mejora futura opcional).

---

## 4. Plan por fases

### Fase 0: Alineación y línea base

**Objetivo:** contexto compartido y escenarios de prueba realistas para ventas.

**Actividades:**

- Revisar `brief-agent.md` y `architecture.md` frente al código.
- Inventario: CLI, API, herramientas en `createAgent.ts`, `env.example` vs `getEnv`.
- Escenarios prioritarios: consulta de catálogo vía tienda, conversación sin herramientas, dos turnos en API con el mismo `sessionId`.

**Entregables:** resumen de estado y lista de escenarios.

**Criterio de salida:** el equipo entiende alcance **solo ventas + http_get_api_tienda**.

---

### Fase 1: Arquitectura y operación local

**Objetivo:** arranque sin fricción y responsabilidades claras.

**Actividades:**

- Confirmar mapa: `src/index.ts`, `chatServer.ts`, `serverListen.ts`, `runAgent.ts`, `createAgent.ts`, `config/env.ts`, `agent/tools/*`.
- Alinear `package.json` (dev/start/build) con el entrypoint real del servidor.
- Guía corta para añadir una herramienta nueva (registro, prompt, env si aplica).

**Criterio de salida:** cualquiera ubica en minutos dónde cambiar HTTP, agente o configuración.

---

### Fase 2: Comportamiento del agente de ventas

**Objetivo:** tono y decisiones de herramientas acertadas.

**Actividades:**

- Revisar `prompt.ts`: no inventar catálogo; cuándo usar `http_get_api_tienda`.
- Validar escenarios: solo texto comercial, consulta a tienda, combinado.
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

**Objetivo:** sustituir el placeholder de `npm test`.

**Actividades:** runner (Vitest o Node test), tests de `getEnv`, utilidades de herramientas, opcional `supertest` con `runAgent` mockeado.

**Criterio de salida:** regresiones detectables por tests en el alcance cubierto.

---

### Fase 5: Documentación y handoff

**Objetivo:** README y docs coherentes; roadmap incremental (CRM, catálogo, persistencia, etc.).

**Criterio de salida:** una persona nueva puede ejecutar y extender el proyecto.

---

## 5. Cronograma sugerido (iterativo)

- **Semana 1:** Fase 0 + Fase 1  
- **Semana 2:** Fase 2  
- **Semana 3:** Fase 3  
- **Semana 4:** Fase 4 + Fase 5  

---

## 6. Definition of Done operativa

- Comportamiento acorde a **agente de ventas** y español claro.
- Casos prioritarios: consulta a tienda, mixtos, conversación sin herramientas.
- CLI y API documentados; `web/` alineado.
- `env.example` y README coherentes con `getEnv`.
- Brief, plan y arquitectura reflejan el repositorio.

---

## 7. Riesgos y mitigaciones

- **Alucinaciones comerciales:** mitigar con prompt explícito y no afirmar precios/stock sin fuente en la conversación.
- **Herramienta de tienda mal usada:** mitigar con descripciones de tool y ejemplos en pruebas manuales.
- **Memoria solo en RAM:** documentar; roadmap si hace falta persistencia.
- **Regresiones en API:** tests de contrato / mocks.
- **Docs vs código:** Fase 0 y revisión al cerrar cada entrega.

---

## 8. Próximos pasos

1. Fase 0 en una sesión corta (demo CLI + API).  
2. Fase 1: scripts y README.  
3. Fase 2 y 3 en paralelo con cuidado en el contrato del API.  
4. Registrar decisiones de producto y de prompt.  
