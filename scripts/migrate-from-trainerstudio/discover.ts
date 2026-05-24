/**
 * Discovery: llama a la API real de TrainerStudio y vuelca a `discovered.json`
 * el shape (estructura) de cada respuesta. Lo usamos como referencia para
 * reescribir migrate.ts con el formato correcto.
 *
 * USO:
 *   npm run discover
 *
 * Lee TS_API_KEY y TS_BASE del .env (los mismos que migrate.ts).
 * NO escribe en Supabase. NO modifica nada en TS. Solo GETs.
 * Resultado: discovered.json en este mismo directorio.
 */

import dotenv from "dotenv";
import { writeFileSync } from "node:fs";

dotenv.config();

const TS_BASE = (process.env.TS_BASE ?? "https://api.trainerstudio.io").replace(
  /\/$/,
  ""
);
const TS_API_KEY = process.env.TS_API_KEY ?? "";

if (!TS_API_KEY) {
  console.error("Falta TS_API_KEY en .env");
  process.exit(1);
}

const HEADERS = {
  "X-API-Key": TS_API_KEY,
  Accept: "application/json",
};

type Result = {
  endpoint: string;
  status: number;
  ok: boolean;
  body: unknown;
  error?: string;
};

const results: Record<string, Result> = {};

async function get(endpoint: string): Promise<Result> {
  const url = TS_BASE + endpoint;
  try {
    const res = await fetch(url, { headers: HEADERS });
    const text = await res.text();
    let body: unknown = text;
    try {
      body = JSON.parse(text);
    } catch {
      // not JSON
    }
    return {
      endpoint,
      status: res.status,
      ok: res.ok,
      body,
    };
  } catch (e) {
    return {
      endpoint,
      status: 0,
      ok: false,
      body: null,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

function pick<T>(arr: T[] | undefined, key: string): T | undefined {
  return Array.isArray(arr) ? arr[0] : undefined;
}

function extractItems(body: unknown): unknown[] {
  if (Array.isArray(body)) return body;
  if (body && typeof body === "object") {
    const obj = body as Record<string, unknown>;
    for (const k of [
      "items",
      "data",
      "results",
      "exercises",
      "customers",
      "programs",
      "photos",
      "notes",
      "rows",
    ]) {
      if (Array.isArray(obj[k])) return obj[k] as unknown[];
    }
  }
  return [];
}

function getId(item: unknown): string | undefined {
  if (!item || typeof item !== "object") return undefined;
  const o = item as Record<string, unknown>;
  const v = o.id ?? o._id ?? o.uuid;
  return typeof v === "string" || typeof v === "number" ? String(v) : undefined;
}

async function main() {
  console.log(`Discovery → ${TS_BASE}`);
  console.log("");

  // === A) Endpoints sin params ===
  console.log("→ /me");
  results["GET /me"] = await get("/me");

  console.log("→ /coach/account");
  results["GET /coach/account"] = await get("/coach/account");

  console.log("→ /coach/profile-data");
  results["GET /coach/profile-data"] = await get("/coach/profile-data");

  // === B) Listados paginados ===
  console.log("→ /exercises?pageSize=3&pageNum=1");
  const exRes = await get("/exercises?pageSize=3&pageNum=1");
  results["GET /exercises (page 1)"] = exRes;

  console.log("→ /coach/customers?archived=false&pageSize=3&pageNum=1");
  const custRes = await get(
    "/coach/customers?archived=false&pageSize=3&pageNum=1"
  );
  results["GET /coach/customers (page 1)"] = custRes;

  console.log("→ /coach/customers?archived=true&pageSize=3&pageNum=1");
  results["GET /coach/customers (archived)"] = await get(
    "/coach/customers?archived=true&pageSize=3&pageNum=1"
  );

  console.log("→ /coach/programs?archived=false&pageSize=3&pageNum=1");
  const progRes = await get(
    "/coach/programs?archived=false&pageSize=3&pageNum=1"
  );
  results["GET /coach/programs (page 1)"] = progRes;

  // === C) Detalles (usando primer id de cada listado) ===
  const exItems = extractItems(exRes.body);
  const exId = getId(exItems[0]);
  if (exId) {
    console.log(`→ /exercises/${exId}`);
    results[`GET /exercises/{id}`] = await get(`/exercises/${exId}`);
  }

  const custItems = extractItems(custRes.body);
  const custId = getId(custItems[0]);
  if (custId) {
    console.log(`→ /coach/customers/${custId}`);
    results[`GET /coach/customers/{id}`] = await get(
      `/coach/customers/${custId}`
    );

    console.log(`→ /coach/customers/${custId}/compliance`);
    results[`GET /coach/customers/{id}/compliance`] = await get(
      `/coach/customers/${custId}/compliance`
    );

    console.log(`→ /coach/customers/${custId}/notes`);
    results[`GET /coach/customers/{id}/notes`] = await get(
      `/coach/customers/${custId}/notes`
    );

    console.log(`→ /coach/customers/${custId}/progress-photos`);
    results[`GET /coach/customers/{id}/progress-photos`] = await get(
      `/coach/customers/${custId}/progress-photos`
    );

    console.log(`→ /coach/customers/${custId}/metrics-sets`);
    results[`GET /coach/customers/{id}/metrics-sets`] = await get(
      `/coach/customers/${custId}/metrics-sets`
    );

    console.log(`→ /coach/customers/${custId}/wblocks`);
    results[`GET /coach/customers/{id}/wblocks`] = await get(
      `/coach/customers/${custId}/wblocks`
    );

    console.log(`→ /coach/customers/${custId}/activity-feed`);
    results[`GET /coach/customers/{id}/activity-feed`] = await get(
      `/coach/customers/${custId}/activity-feed`
    );

    console.log(`→ /coach/customers/${custId}/musclegroups/volume`);
    results[`GET /coach/customers/{id}/musclegroups/volume`] = await get(
      `/coach/customers/${custId}/musclegroups/volume`
    );
  }

  const progItems = extractItems(progRes.body);
  const progId = getId(progItems[0]);
  if (progId) {
    console.log(`→ /coach/programs/${progId}`);
    results[`GET /coach/programs/{id}`] = await get(
      `/coach/programs/${progId}`
    );

    console.log(`→ /coach/programs/${progId}/wblocks`);
    results[`GET /coach/programs/{id}/wblocks`] = await get(
      `/coach/programs/${progId}/wblocks`
    );
  }

  // === D) Ejercicio del coach + cliente: historial ===
  if (custId && exId) {
    console.log(
      `→ /coach/customers/${custId}/exercise/${exId}/history`
    );
    results[`GET /coach/customers/{id}/exercise/{id}/history`] = await get(
      `/coach/customers/${custId}/exercise/${exId}/history`
    );
  }

  // === E) Catálogos compartidos ===
  console.log("→ /muscle-groups");
  results["GET /muscle-groups"] = await get("/muscle-groups");

  console.log("→ /metrics-units");
  results["GET /metrics-units"] = await get("/metrics-units");

  // === Resumen + archivo ===
  console.log("");
  console.log("Resumen:");
  for (const [key, r] of Object.entries(results)) {
    const items = extractItems(r.body);
    const summary = r.ok
      ? `${r.status} OK${items.length ? ` (${items.length} items)` : ""}`
      : `${r.status} FAIL`;
    console.log(`  ${key.padEnd(60)} → ${summary}`);
  }

  // Anonimizar: si encontramos email, lo enmascaramos
  const json = JSON.stringify(results, null, 2);
  const masked = json
    .replace(
      /"email":\s*"([^"@]+)@([^"]+)"/g,
      (_m, _u, d) => `"email": "***@${d}"`
    )
    .replace(
      /"phone":\s*"[^"]+"/g,
      '"phone": "***"'
    );

  writeFileSync("discovered.json", masked);
  console.log("");
  console.log("✓ Escrito discovered.json en este directorio.");
  console.log("  Compártemelo (pega su contenido en el chat).");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
