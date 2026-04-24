import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assertAllowedStorePath,
  fetchStorePath,
  resolveStoreUrl,
  type FetchFn
} from "./store.js";

describe("assertAllowedStorePath", () => {
  it("acepta /api y /api con query", () => {
    assert.equal(assertAllowedStorePath("/api"), "/api");
    assert.equal(assertAllowedStorePath("/api?output_format=JSON"), "/api?output_format=JSON");
  });

  it("acepta rutas bajo /api/", () => {
    assert.equal(
      assertAllowedStorePath("/api/products?output_format=JSON"),
      "/api/products?output_format=JSON"
    );
  });

  it("rechaza esquema // (SSRF)", () => {
    assert.throws(() => assertAllowedStorePath("//evil.com/api/x"), /no válida/);
  });

  it("rechaza prefijos fuera de /api", () => {
    assert.throws(() => assertAllowedStorePath("/admin"), /Solo se permiten/);
    assert.throws(() => assertAllowedStorePath("/apinope"), /Solo se permiten/);
  });

  it("rechaza segmentos ..", () => {
    assert.throws(() => assertAllowedStorePath("/api/../etc"), /\.\./);
  });
});

describe("resolveStoreUrl", () => {
  it("resuelve contra la base y exige mismo origin", () => {
    const u = resolveStoreUrl("https://tienda.example.com", "/api/products");
    assert.equal(u.href, "https://tienda.example.com/api/products");
  });

  it("rechaza si el path intenta otro host vía //", () => {
    assert.throws(
      () => resolveStoreUrl("https://tienda.example.com", "//evil.com/x"),
      /no válida/
    );
  });
});

describe("fetchStorePath", () => {
  it("usa fetch inyectado y devuelve estado y cuerpo", async () => {
    const fetchImpl: FetchFn = async () =>
      new Response('{"items":[]}', {
        status: 200,
        statusText: "OK",
        headers: { "content-type": "application/json" }
      });
    const out = await fetchStorePath({
      baseUrl: "https://tienda.example.com",
      path: "/api/products?output_format=JSON",
      timeoutMs: 5000,
      maxChars: 10_000,
      fetchImpl
    });
    assert.match(out, /HTTP 200/);
    assert.match(out, /application\/json/);
    assert.match(out, /\{"items":\[\]\}/);
  });

  it("envía Authorization Basic cuando hay wsKey", async () => {
    let auth: string | undefined;
    const fetchImpl: FetchFn = async (_input, init) => {
      const h = init?.headers;
      if (h instanceof Headers) {
        auth = h.get("Authorization") ?? undefined;
      } else if (h && typeof h === "object" && !Array.isArray(h)) {
        auth = (h as Record<string, string>)["Authorization"];
      }
      return new Response("{}", { status: 200, headers: { "content-type": "application/json" } });
    };
    await fetchStorePath({
      baseUrl: "https://example.com",
      path: "/api/x",
      timeoutMs: 5000,
      maxChars: 1000,
      wsKey: "MYKEY",
      fetchImpl
    });
    assert.equal(auth, `Basic ${Buffer.from("MYKEY:", "utf8").toString("base64")}`);
  });

  it("trunca respuestas largas", async () => {
    const body = "x".repeat(100);
    const fetchImpl: FetchFn = async () =>
      new Response(body, { status: 200, headers: { "content-type": "text/plain" } });
    const out = await fetchStorePath({
      baseUrl: "https://example.com",
      path: "/api/x",
      timeoutMs: 5000,
      maxChars: 50,
      fetchImpl
    });
    assert.match(out, /truncada/);
    assert.ok(out.length < body.length + 500);
  });
});
