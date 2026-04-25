# Brief del agente dIAna (oportunidades de mercado / Binance)

## 1. Título de la tarea

Mantener y documentar un **agente conversacional** en español, con base didáctica, enfocado en **explorar oportunidades de mercado** usando datos públicos de **Binance**, que se exponga por **API HTTP** con memoria de sesión además de la **consola**.

---

## 2. Contexto

El repositorio **diana** combina un propósito **educativo** (LangChain, herramientas, capas ordenadas) con un caso de uso **mercados cripto**: lectura de velas recientes, razonamiento prudente sobre contexto de precio/volumen, y guía para que el usuario formule hipótesis (sin prometer resultados).

**Qué existe hoy:**

- **Consola:** una pregunta por invocación; el agente decide si usa herramientas y responde en español.
- **API HTTP (Express):** chat con `sessionId` y mensaje; historial en **RAM** (últimos 20 mensajes por sesión), salud y recuperación de historial.
- **Cliente (opcional):** cualquier consumidor HTTP del API (puede existir una UI estática en `web/` si se agrega al repo).
- **Herramientas (hoy):** market data MVP (`market_data_*`) para suscripción/consulta de velas Binance 1m (ver `src/agent/tools/marketData.ts`).

**Cuidados a corto plazo:**

- El modelo **no** inventa datos de mercado: si no hay evidencia en la conversación o en la salida de tools, dilo explícitamente.
- Configuración validada al arrancar (OpenRouter obligatorio, etc.); documentar `env` y archivo local.
- **Pruebas automatizadas** existen para normalización de velas (`npm test`), pero el resto del sistema aún depende bastante de prueba manual.

---

## 3. Requerimientos del proyecto

### Lenguaje y stack

- TypeScript, Node.js, **ESM**.
- **LangChain** (agente con tool calling) y modelo vía **OpenRouter**.
- **Express** para el API de chat; **CORS** para desarrollo local.
- **Zod** para validar entorno.

### Arquitectura

- **Entrada:** CLI o JSON del cliente.
- **Ejecución:** `runAgent` con historial opcional.
- **Composición:** modelo, prompt (mercado), herramientas (hoy: **market data**).
- **Configuración:** `env.local` + validación centralizada.

### Input esperado

Lenguaje natural en español: preguntas sobre lectura de mercado, hipótesis, gestión de riesgo (a nivel educativo) y solicitudes de datos cuando corresponda usar tools.

**Resultado esperado**

- Español, tono profesional y didáctico donde aplique.
- Uso de herramientas solo cuando aporte.
- Sin afirmar certezas de mercado ni “señales infalibles”; separa hechos (datos) de interpretación.

---

## 4. Restricciones

- Claridad pedagógica y código fácil de seguir.
- Secretos solo en servidor / entorno.
- Memoria de sesión en RAM: no es persistencia multi-instancia.
- Documentar cambios en API, entorno o comportamiento del agente.

---

## 5. Definition of Done (DoD)

- El brief coincide con **CLI + API**, herramientas actuales del agente, y dependencia principal **OpenRouter**.
- Límites claros: sin asesoría financiera personalizada; memoria en servidor; calidad manual hasta tener tests.
- Coherencia con `architecture.md` y `src/`.
- Cambios futuros: `env` válido, prueba manual del flujo tocado, contrato cliente-servidor si aplica, docs actualizadas.
