import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { getEnv } from "../../config/env.js";

/** Rutas GET típicas de webservice PrestaShop (p. ej. con `?output_format=JSON`). */
const KNOWN_PS_WS_HINT =
  "Ejemplos: /api?output_format=JSON (índice), /api/products?output_format=JSON, /api/categories?output_format=JSON.";

export type FetchFn = typeof fetch;

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, "");
}

/**
 * Valida `path` para evitar SSRF (p. ej. path `//evil.com`).
 * Solo se permiten rutas bajo `/api/`.
 */
export function assertAllowedStorePath(path: string): string {
  const trimmed = path.trim();
  if (!trimmed.startsWith("/")) {
    throw new Error("path debe ser absoluta y empezar por / (p. ej. /api/products?output_format=JSON).");
  }
  if (trimmed.startsWith("//")) {
    throw new Error("path no válida.");
  }
  const noHash = trimmed.split("#")[0] ?? "";
  const isApiRoot = noHash === "/api" || noHash.startsWith("/api?");
  const isApiNested = noHash.startsWith("/api/");
  if (!isApiRoot && !isApiNested) {
    throw new Error("Solo se permiten rutas bajo /api... " + KNOWN_PS_WS_HINT);
  }
  const noQuery = trimmed.split("?")[0] ?? "";
  const segments = noQuery.split("/").filter(Boolean);
  for (const seg of segments) {
    if (seg === ".." || seg === ".") {
      throw new Error("path no puede contener segmentos . o ..");
    }
  }
  if (/[\r\n\0]/.test(trimmed)) {
    throw new Error("path contiene caracteres no permitidos.");
  }
  return trimmed;
}

export function resolveStoreUrl(baseUrl: string, path: string): URL {
  const base = new URL(normalizeBaseUrl(baseUrl));
  const p = assertAllowedStorePath(path);
  const resolved = new URL(p, base);
  if (resolved.origin !== base.origin) {
    throw new Error("La URL resuelta no coincide con el origen configurado de la tienda.");
  }
  return resolved;
}

function basicAuthHeader(wsKey: string): string {
  const token = Buffer.from(`${wsKey}:`, "utf8").toString("base64");
  return `Basic ${token}`;
}

export interface FetchStorePathOptions {
  baseUrl: string;
  path: string;
  timeoutMs: number;
  maxChars: number;
  wsKey?: string;
  fetchImpl?: FetchFn;
}

export async function fetchStorePath(options: FetchStorePathOptions): Promise<string> {
  const { path, timeoutMs, maxChars, wsKey, fetchImpl = fetch } = options;
  const url = resolveStoreUrl(options.baseUrl, path);
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  const headers: Record<string, string> = {
    Accept: "application/json, application/xml;q=0.9, text/*;q=0.8"
  };
  const key = wsKey?.trim();
  if (key) {
    headers.Authorization = basicAuthHeader(key);
  }
  let res: Response;
  try {
    res = await fetchImpl(url, {
      method: "GET",
      headers,
      signal: controller.signal
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (e instanceof Error && e.name === "AbortError") {
      return `Error: tiempo de espera agotado (${timeoutMs} ms) al consultar ${url.pathname}${url.search}.`;
    }
    return `Error al consultar la tienda: ${msg}`;
  } finally {
    clearTimeout(t);
  }

  const contentType = res.headers.get("content-type") ?? "(desconocido)";
  const raw = await res.text();
  const truncated = raw.length > maxChars;
  const body = truncated ? raw.slice(0, maxChars) : raw;
  const suffix = truncated ? `\n\n[Respuesta truncada a ${maxChars} caracteres.]` : "";

  return [
    `HTTP ${res.status} ${res.statusText}`,
    `Content-Type: ${contentType}`,
    `URL: ${url.pathname}${url.search}`,
    "",
    body + suffix
  ].join("\n");
}

export const httpGetApiTiendaTool = tool(
  async ({ path }: { path: string }) => {
    const env = getEnv();
    const baseUrl = env.STORE_BASE_URL?.trim();
    if (!baseUrl) {
      return "http_get_api_tienda no está disponible: define STORE_BASE_URL en las variables de entorno del servidor.";
    }
    return fetchStorePath({
      baseUrl,
      path,
      timeoutMs: env.STORE_TIMEOUT_MS,
      maxChars: env.STORE_MAX_RESPONSE_CHARS,
      wsKey: env.STORE_WS_KEY
    });
  },
  {
    name: "http_get_api_tienda",
    description: `Ejecuta un GET HTTP contra la API del comercio (solo rutas bajo /api/...). La URL base es STORE_BASE_URL en el servidor.
Úsala antes de afirmar catálogo, precios o textos que dependan del sistema de tienda.
Solo rutas bajo /api/... ${KNOWN_PS_WS_HINT}
Si recibes 401, puede faltar STORE_WS_KEY (webservice PrestaShop: Basic con usuario = clave, contraseña vacía).`,
    schema: z.object({
      path: z
        .string()
        .min(1)
        .describe(
          'Ruta absoluta bajo /api/, opcionalmente con query. Ej.: "/api/products?output_format=JSON"'
        )
    })
  }
);
