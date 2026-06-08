/**
 * Migra las FOTOS DE PROGRESO de TrainerStudio a mi-hub.
 * TS: GET /coach/customers/{id}/progress-photos?pageNum&pageSize → docs[] con
 *     photos.{front,back,side}{Key,Url} (URLs firmadas, resolución completa) + createdAt.
 * mi-hub: descarga el binario, lo sube al bucket `fotos-progreso` en
 *     {coach_id}/{clienta_id}/{archivo} e inserta fila en `fotos_progreso`.
 *
 * Idempotente: si ya existe una fila con esa `url`, se omite (no re-descarga).
 *
 * Uso:  npx tsx migrar-fotos.ts            (dry-run)
 *       npx tsx migrar-fotos.ts --apply    (escribe)
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
config();

const TS = (process.env.TS_BASE ?? "https://api.trainerstudio.io").replace(/\/$/, "");
const KEY = process.env.TS_API_KEY ?? "";
const H = { "X-API-Key": KEY, Accept: "application/json" };
const APPLY = process.argv.includes("--apply");
const BUCKET = "fotos-progreso";
const TIPO: Record<string, string> = { front: "frontal", side: "lateral", back: "trasera" };

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

async function fotosDe(cid: string): Promise<any[]> {
  const out: any[] = [];
  for (let page = 1; page < 30; page++) {
    const r = await fetch(`${TS}/coach/customers/${cid}/progress-photos?pageNum=${page}&pageSize=50`, { headers: H });
    if (!r.ok) break;
    const j: any = await r.json();
    const docs = j.docs ?? [];
    out.push(...docs);
    if (docs.length < 50) break;
  }
  return out;
}

function basename(key: string): string {
  return key.split("/").pop() ?? `${Date.now()}.jpeg`;
}

async function main() {
  console.log(`Migrar fotos de progreso TS → mi-hub${APPLY ? "" : " (DRY-RUN)"}\n`);

  const { data: coach } = await sb.from("coaches").select("id").limit(1).single();
  const coachId = coach!.id as string;

  const { data: cls } = await sb
    .from("clientas")
    .select("id, nombre, apellidos, trainerstudio_id")
    .not("trainerstudio_id", "is", null);

  let creadas = 0, omitidas = 0, errores = 0;

  for (const c of cls ?? []) {
    const docs = await fotosDe(c.trainerstudio_id as string);
    if (docs.length === 0) continue;
    const nombre = `${c.nombre} ${c.apellidos ?? ""}`.trim();
    console.log(`== ${nombre} (${docs.length} sesiones) ==`);

    for (const doc of docs) {
      const fecha = String(doc.createdAt ?? "").slice(0, 10) || null;
      const photos = doc.photos ?? {};
      for (const lado of ["front", "side", "back"] as const) {
        const url = photos[`${lado}Url`];
        const key = photos[`${lado}Key`];
        if (!url || !key) continue;
        const archivo = basename(key);
        const path = `${coachId}/${c.id}/${archivo}`;

        // ¿ya migrada?
        const { count } = await sb.from("fotos_progreso").select("*", { count: "exact", head: true }).eq("url", path);
        if (count && count > 0) { omitidas++; continue; }

        if (!APPLY) {
          console.log(`  DRY ${TIPO[lado]} ${fecha}  → ${archivo}`);
          creadas++;
          continue;
        }

        try {
          const bin = await fetch(url);
          if (!bin.ok) { console.log(`  ✗ descarga ${TIPO[lado]} ${fecha}: ${bin.status}`); errores++; continue; }
          const buf = Buffer.from(await bin.arrayBuffer());
          const up = await sb.storage.from(BUCKET).upload(path, buf, { contentType: "image/jpeg", upsert: false });
          if (up.error && !/exists/i.test(up.error.message)) { console.log(`  ✗ subida ${TIPO[lado]}: ${up.error.message}`); errores++; continue; }
          const ins = await sb.from("fotos_progreso").insert({
            coach_id: coachId, clienta_id: c.id, url: path, tipo: TIPO[lado], fecha, notas: null,
          });
          if (ins.error) { console.log(`  ✗ insert ${TIPO[lado]}: ${ins.error.message}`); errores++; continue; }
          console.log(`  ✓ ${TIPO[lado]} ${fecha}`);
          creadas++;
        } catch (e) {
          console.log(`  ✗ ${TIPO[lado]} ${fecha}: ${e instanceof Error ? e.message : e}`);
          errores++;
        }
      }
    }
  }

  console.log(`\n${APPLY ? "Creadas" : "A crear"}: ${creadas}  ·  Omitidas (ya existían): ${omitidas}  ·  Errores: ${errores}`);
  if (!APPLY) console.log("(dry-run; lanza con --apply para escribir)");
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
