# Brief del agente dIAna (ventas)

## 1. Título de la tarea

Mantener y documentar un **agente de ventas** conversacional en español, con base didáctica, que responda con claridad, use **http_get_api_tienda** cuando aporte valor, y se exponga por **API HTTP** con memoria de sesión además de la **consola**.

---

## 2. Contexto

El repositorio **diana** combina un propósito **educativo** (LangChain, herramientas, capas ordenadas) con un caso de uso **ventas y asistencia comercial**: redacción de mensajes, orientación en conversaciones y datos del catálogo cuando la herramienta de tienda esté disponible.

**Qué existe hoy:**

- **Consola:** una pregunta por invocación; el agente decide si usa herramientas y responde en español.
- **API HTTP (Express):** chat con `sessionId` y mensaje; historial en **RAM** (últimos 20 mensajes por sesión), salud y recuperación de historial.
- **Cliente web:** página estática en `web/` para probar la API local; debe mantenerse alineada con el contrato del backend.
- **Herramientas:** **http_get_api_tienda** (`GET` acotado a `/api/...` sobre la URL de tienda configurada).

**Cuidados a corto plazo:**

- El modelo **no** sustituye datos reales de producto, precios ni políticas: si no están en la conversación ni en la respuesta de la tienda, no los inventes.
- Configuración validada al arrancar (OpenRouter obligatorio, etc.); documentar `env` y archivo local.
- **Pruebas automatizadas** aún por introducir; calidad con revisión y pruebas manuales.
- **Scripts de arranque** en `package.json` pueden no coincidir con el entrypoint real (`serverListen.ts`): conviene alinearlos.

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
- **Composición:** modelo, prompt de ventas, herramientas (**http_get_api_tienda**).
- **Configuración:** `env.local` + validación centralizada.

### Input esperado

Lenguaje natural en español: consultas de ventas, borradores de mensajes, objeciones o preguntas sobre el catálogo cuando corresponda usar la tienda.

**Resultado esperado**

- Español, tono comercial adecuado y didáctico donde aplique.
- Uso de herramientas solo cuando aporte.
- Sin afirmar datos de catálogo, precios ni disponibilidad no confirmados por el usuario.

---

## 4. Restricciones

- Claridad pedagógica y código fácil de seguir.
- Secretos solo en servidor / entorno.
- Memoria de sesión en RAM: no es persistencia multi-instancia.
- Documentar cambios en API, entorno o comportamiento del agente.

---

## 5. Definition of Done (DoD)

- El brief coincide con **CLI + API**, herramienta **http_get_api_tienda**, y dependencia principal **OpenRouter**.
- Límites claros: sin inventar ofertas comerciales; memoria en servidor; calidad manual hasta tener tests.
- Coherencia con `architecture.md` y `src/`.
- Cambios futuros: `env` válido, prueba manual del flujo tocado, contrato cliente-servidor si aplica, docs actualizadas.
