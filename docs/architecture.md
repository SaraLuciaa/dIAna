# Arquitectura del proyecto

Este proyecto implementa un **agente LangChain** orientado a **explorar oportunidades de mercado** (MVP, educativo) usando datos públicos de **Binance**, y en paralelo un **MVP de market data** (Binance WS → velas normalizadas). La ejecución del agente vive en el **servidor**; cualquier cliente (CLI, curl, UI) consume la API por HTTP.

## Flujo general (cliente-servidor)

1. El **cliente** envía el mensaje del usuario al servidor por HTTP.
2. El **servidor** (`src/chatServer.ts`) recibe la petición en los endpoints del chat.
3. `runAgent` en `src/agent/runAgent.ts` invoca el agente (`ReactAgent`) con la entrada y el historial de la sesión.
4. `buildAgentExecutor` en `src/agent/createAgent.ts` compone modelo, prompt del agente y herramientas.
5. El agente elige herramientas cuando el prompt y la consulta lo justifican.
6. El servidor devuelve la respuesta al cliente.

Una **CLI** (`src/index.ts`) reutiliza `runAgent` para desarrollo y pruebas rápidas sin duplicar lógica.

## Responsabilidades por módulo

### Market data (pipeline de señales en tiempo real)

- **`src/marketData/binanceKlineStream.ts`** — Ingesta (MVP): se conecta al WebSocket de Binance, maneja reconexión y tolera mensajes malformados. **No** contiene lógica de indicadores ni decisiones.
- **`src/marketData/binanceKlineHub.ts`** — Hub MVP: mantiene **una suscripción por símbolo** y un **ring buffer** en RAM para lecturas discretas (p. ej. desde tools del agente).
- **`src/marketData/normalization/*`** — **Normalización** (contrato interno): transforma payloads crudos del proveedor a `NormalizedCandle` (`normalizeCandle`, adapters por proveedor, y `normalizeCandleStream` para consumo async).
- **`src/marketData/asyncQueue.ts`** — Cola async in-memory para consumo via `for await ... of` (MVP).
- **`src/marketData/types.ts`** — Contrato `NormalizedCandle` (estructura obligatoria para el resto del pipeline).
- **`src/marketData/example.ts`** — Ejemplo/manual de consumo del stream (no es núcleo del producto; sirve para smoke tests locales).

### Configuración y núcleo del agente

- **`src/config/env.ts`** — Carga `env.local` y valida variables con Zod.
- **`src/agent/model.ts`** — `ChatOpenAI` hacia OpenRouter.
- **`src/agent/prompt.ts`** — Rol del agente (mercado/oportunidades) e instrucciones de uso de herramientas.
- **`src/agent/tools/*`** — Herramientas LangChain registradas en `createAgent.ts`.
  - Hoy: **`src/agent/tools/marketData.ts`** (`market_data_*`) para suscribirse a velas Binance 1m, leer un buffer reciente, **esperar** N velas (modo CLI) y desuscribirse.
- **`src/agent/createAgent.ts`** — Ensambla modelo, herramientas y prompt.
- **`src/agent/runAgent.ts`** — Punto único de invocación para CLI, servidor y tests.

### Capa servidor (API)

- **`src/chatServer.ts`** — App Express: CORS, JSON limitado, sesiones en memoria, rutas de chat y salud.
- **`src/serverListen.ts`** — Lee el puerto desde `getEnv()` y escucha.

### Cliente

- **Cualquier cliente HTTP** (incluida una UI estática opcional) puede consumir el API. Si existe carpeta `web/`, su rol es solo de cliente de prueba.

## Decisiones de diseño

- **TypeScript ESM** y Node moderno.
- **Validación centralizada de entorno** para fallar pronto al desplegar o arrancar.
- **OpenRouter** vía API compatible con OpenAI.
- **Inyección** de `runAgent` / executor en el servidor para pruebas.
- **Separación cliente-servidor** para no exponer secretos y poder cambiar la UI sin duplicar LangChain.
- **Market data desacoplado**: `src/marketData/*` es reutilizable y no depende del agente; emite únicamente eventos de vela normalizados.

## Resumen

| Capa | Rol principal |
|------|----------------|
| Cliente HTTP | Entrada del usuario y visualización/consumo de respuestas. |
| Servidor API | Sesiones, HTTP y llamada a `runAgent`. |
| `src/agent/*` | Modelo, prompt (mercado), herramientas y ejecución. |
| `src/marketData/*` | Ingesta WS, normalización y utilidades MVP (hub/buffer). |

## Extensiones futuras (sin implementar)

- **Múltiples símbolos**: multiplexing (varios streams) o `/stream?streams=` para consolidar sockets.
- **Persistencia**: escribir a Kafka/Redis Streams/DB (el `NormalizedCandle` es el contrato).
- **Backpressure real**: límites de buffer, políticas de drop, métricas.
- **Observabilidad**: contadores de reconexión, latencia, y tasa de mensajes.
- **Validación estricta**: Zod para payloads entrantes si se requiere “fail-closed”.
