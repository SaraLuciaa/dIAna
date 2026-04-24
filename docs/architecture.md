# Arquitectura del proyecto

Este proyecto implementa un **agente de ventas** con herramientas LangChain (consulta HTTP acotada a la tienda), modular para claridad y extensión gradual. La ejecución del agente vive en el **servidor**; la **interfaz web** es un cliente que consume la API.

## Flujo general (cliente-servidor)

1. El **cliente web** envía el mensaje del usuario al servidor por HTTP.
2. El **servidor** (`src/chatServer.ts`) recibe la petición en los endpoints del chat.
3. `runAgent` en `src/agent/runAgent.ts` invoca el agente (`ReactAgent`) con la entrada y el historial de la sesión.
4. `buildAgentExecutor` en `src/agent/createAgent.ts` compone modelo, prompt de ventas y herramientas.
5. El agente elige herramientas cuando el prompt y la consulta lo justifican.
6. El servidor devuelve la respuesta al cliente; la UI la muestra.

Una **CLI** (`src/index.ts`) reutiliza `runAgent` para desarrollo y pruebas rápidas sin duplicar lógica.

## Responsabilidades por módulo

### Configuración y núcleo del agente

- **`src/config/env.ts`** — Carga `env.local` y valida variables con Zod.
- **`src/agent/model.ts`** — `ChatOpenAI` hacia OpenRouter.
- **`src/agent/prompt.ts`** — Rol de ventas e instrucciones de uso de herramientas.
- **`src/agent/tools/store.ts`** — **`http_get_api_tienda`**: `GET` HTTP solo a rutas bajo `/api/...` respecto a **`STORE_BASE_URL`** (definida en entorno), con validación anti-SSRF, timeout y truncado de respuesta. Opcionalmente **`STORE_WS_KEY`** envía HTTP Basic (usuario = clave, contraseña vacía) para webservices que devuelven 401 sin clave (p. ej. PrestaShop).
- **`src/agent/createAgent.ts`** — Ensambla modelo, herramientas y prompt.
- **`src/agent/runAgent.ts`** — Punto único de invocación para CLI, servidor y tests.

### Capa servidor (API)

- **`src/chatServer.ts`** — App Express: CORS, JSON limitado, sesiones en memoria, rutas de chat y salud.
- **`src/serverListen.ts`** — Lee el puerto desde `getEnv()` y escucha.

### Cliente

- **`web/`** — HTML estático que llama al API local (sin claves en el navegador).

## Decisiones de diseño

- **TypeScript ESM** y Node moderno.
- **Validación centralizada de entorno** para fallar pronto al desplegar o arrancar.
- **OpenRouter** vía API compatible con OpenAI.
- **Inyección** de `runAgent` / executor en el servidor para pruebas.
- **Separación cliente-servidor** para no exponer secretos y poder cambiar la UI sin duplicar LangChain.
- **Salida a red hacia la tienda** solo desde el servidor, con **`STORE_BASE_URL`** en entorno (sin URL en código) y lista blanca de prefijos `/api`, no URLs arbitrarias elegidas por el modelo.

## Resumen

| Capa | Rol principal |
|------|----------------|
| Cliente web | Entrada del usuario y visualización de respuestas. |
| Servidor API | Sesiones, HTTP y llamada a `runAgent`. |
| `src/agent/*` | Modelo, prompt de ventas, herramientas y ejecución. |

Se puede ampliar este documento con el contrato exacto de cada endpoint del chat y, si en el futuro se añaden CRM u otras fuentes, las nuevas integraciones y su lugar en las capas. Rutas típicas del WS PrestaShop (tras configurar la clave): `/api?output_format=JSON`, `/api/products?output_format=JSON`, `/api/categories?output_format=JSON`.
