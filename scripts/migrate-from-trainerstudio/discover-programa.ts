/**
 * Discovery específico para programas: ¿cómo extraer wblocks/witems
 * desde la API de TS? El endpoint /coach/programs/{id}/wblocks dio
 * 404 antes, pero hay varios caminos por probar.
 *
 * Uso:
 *   npm run discover-programa <programaId> [clientaTSId]
 *
 * Si no se pasa clientaTSId, intenta sacarla de las asignaciones del
 * programa via compliance de clientas activas.
 *
 * Genera discovered-programa.json con todos los resultados para
 * análisis.
 */

import { writeFileSync } from "node:fs";
import dotenv from "dotenv";

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

const args = process.argv.slice(2);
const programaId = args[0];
const clientaTSIdArg = args[1];

if (!programaId) {
  console.error("Uso: npm run discover-programa <programaId> [clientaTSId]");
  console.error(
    'Ej:  npm run discover-programa "69a986d2cd8ba768f3c69289" "69b3c2f1d1f5a6b63a4948aa"'
  );
  process.exit(1);
}

const HEADERS = {
  "X-API-Key": TS_API_KEY,
  Accept: "application/json",
};

type Resultado = {
  endpoint: string;
  metodo: string;
  status: number;
  ok: boolean;
  body: unknown;
};
const resultados: Resultado[] = [];

async function probar(
  endpoint: string,
  metodo: "GET" | "POST" = "GET"
): Promise<Resultado> {
  const url = TS_BASE + endpoint;
  try {
    const res = await fetch(url, { method: metodo, headers: HEADERS });
    const text = await res.text();
    let body: unknown = text;
    try {
      body = JSON.parse(text);
    } catch {
      // raw text
    }
    const r: Resultado = {
      endpoint,
      metodo,
      status: res.status,
      ok: res.ok,
      body,
    };
    const icono = res.ok ? "✓" : "✗";
    const tamano =
      typeof body === "string"
        ? `${text.length} chars`
        : `${JSON.stringify(body).length} chars`;
    console.log(`${icono} ${metodo} ${endpoint.padEnd(70)} ${res.status} (${tamano})`);
    resultados.push(r);
    return r;
  } catch (e) {
    const r: Resultado = {
      endpoint,
      metodo,
      status: 0,
      ok: false,
      body: { error: e instanceof Error ? e.message : String(e) },
    };
    console.log(`✗ ${metodo} ${endpoint.padEnd(70)} ERROR`);
    resultados.push(r);
    return r;
  }
}

async function main() {
  console.log(`Discovery de programa ${programaId}\n`);

  // 1) Confirmar que existe el programa-plantilla
  await probar(`/coach/programs/${programaId}`);

  // 2) Probar variantes para extraer wblocks del programa-plantilla
  await probar(`/coach/programs/${programaId}/wblocks`);
  await probar(`/coach/programs/${programaId}/wblock`);
  // Otras variantes intuición:
  await probar(`/coach/programs/${programaId}/structure`);
  await probar(`/coach/programs/${programaId}/details`);
  await probar(`/coach/programs/${programaId}/full`);

  // 3) Encontrar una clienta que tenga este programa asignado
  let clientaTSId = clientaTSIdArg;
  if (!clientaTSId) {
    console.log("\nNo se pasó clientaTSId. Buscando una con este programa asignado...\n");
    const lista = await probar(
      "/coach/customers?archived=false&pageSize=50&pageNum=1"
    );
    if (lista.ok && lista.body) {
      const docs = (lista.body as { docs?: Array<{ _id: string; name: string }> }).docs ?? [];
      // Buscar via compliance: la primera que tenga workoutBlocks
      for (const c of docs.slice(0, 8)) {
        console.log(`  · Probando compliance de ${c.name} (${c._id})...`);
        const compl = await probar(
          `/coach/customers/${c._id}/compliance`
        );
        if (
          compl.ok &&
          (compl.body as { dailyCompliance?: Array<{ workoutBlocks?: unknown[] }> })
            ?.dailyCompliance?.some((d) => (d.workoutBlocks ?? []).length > 0)
        ) {
          clientaTSId = c._id;
          console.log(`  ✓ Usaremos ${c.name} (${clientaTSId})\n`);
          break;
        }
      }
    }
  }

  if (!clientaTSId) {
    console.log("\nNo se encontró clienta con compliance — no se puede probar wblocks por cliente.");
    writeFileSync("discovered-programa.json", JSON.stringify(resultados, null, 2));
    return;
  }

  // 4) Sacar un wblockId real del compliance de esa clienta
  console.log(`\nObteniendo wblockIds de compliance de clienta ${clientaTSId}...`);
  const compRes = await probar(`/coach/customers/${clientaTSId}/compliance`);
  const wblockIds: string[] = [];
  if (compRes.ok && compRes.body) {
    const dias =
      (compRes.body as {
        dailyCompliance?: Array<{ workoutBlocks?: Array<{ id: string }> }>;
      }).dailyCompliance ?? [];
    for (const d of dias) {
      for (const wb of d.workoutBlocks ?? []) {
        if (!wblockIds.includes(wb.id)) wblockIds.push(wb.id);
      }
    }
  }
  console.log(`  → ${wblockIds.length} wblock ids únicos extraídos`);

  if (wblockIds.length === 0) {
    writeFileSync("discovered-programa.json", JSON.stringify(resultados, null, 2));
    return;
  }

  // 5) Probar detalle de un wblock de cliente
  const wb1 = wblockIds[0]!;
  console.log(`\nProbando wblock individual ${wb1}...`);
  await probar(`/coach/customers/${clientaTSId}/wblocks/${wb1}`);
  await probar(`/coach/customers/${clientaTSId}/wblocks/${wb1}/witems`);

  // 6) Probar variante directa con program id
  await probar(`/coach/programs/${programaId}/wblocks/${wb1}`);
  await probar(`/coach/programs/${programaId}/wblocks/${wb1}/witems`);

  // 7) ¿Existe un endpoint público de la asignación de la clienta?
  await probar(`/coach/customers/${clientaTSId}/programs`);
  await probar(`/coach/customers/${clientaTSId}/programs/active`);
  await probar(`/coach/customers/${clientaTSId}/assignments`);

  // 8) Recopilar TODOS los wblock detalles si el endpoint funcionó
  const okEndpoint = resultados.find(
    (r) =>
      r.ok &&
      r.endpoint.includes(`/wblocks/${wb1}`) &&
      !r.endpoint.endsWith("/witems")
  );
  if (okEndpoint) {
    console.log(
      `\n✓ ${okEndpoint.endpoint} funciona. Descargando los ${wblockIds.length} wblocks completos...`
    );
    const todosLosWblocks: unknown[] = [];
    for (const id of wblockIds) {
      const ep = okEndpoint.endpoint.replace(wb1, id);
      const r = await probar(ep);
      if (r.ok) todosLosWblocks.push(r.body);
    }
    writeFileSync(
      "discovered-wblocks.json",
      JSON.stringify({ clientaTSId, programaId, wblockIds, todosLosWblocks }, null, 2)
    );
    console.log("\n✓ Guardado discovered-wblocks.json con TODOS los wblocks");
  }

  writeFileSync("discovered-programa.json", JSON.stringify(resultados, null, 2));
  console.log("\n✓ Guardado discovered-programa.json con todos los intentos");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
