/**
 * Importa la ESTRUCTURA de los programas (semanas/días/bloques/elementos)
 * desde TrainerStudio a mi-hub. La cabecera de los programas ya está migrada;
 * esto rellena el campo `estructura` (JSONB) que la API "normal" de TS no
 * expone, pero el endpoint /wblock?startDay&endDay sí.
 *
 * Uso:
 *   npm run importar-estructura -- --dry-run   (no escribe; muestra resumen)
 *   npm run importar-estructura                (escribe en Supabase)
 *
 * Mapeo de items de TS → elementos de mi-hub:
 *   TASK     → contenido (título + descripción)
 *   FORM     → contenido (nombre + lista de preguntas)
 *   REMINDER → recordatorio (hora + mensaje)
 *   METRICS  → metrica_prompt
 *   EXERCISE → ejercicio (enlazado por trainerstudio_id; con series si las hay)
 *              o contenido si el ejercicio no se encuentra
 *   CIRCUIT  → contenido (placeholder con el nombre del circuito)
 */

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { randomUUID } from "node:crypto";

dotenv.config();

const TS_BASE = (process.env.TS_BASE ?? "https://api.trainerstudio.io").replace(/\/$/, "");
const TS_API_KEY = process.env.TS_API_KEY ?? "";
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const DRY = process.argv.includes("--dry-run");

if (!TS_API_KEY || !SUPABASE_URL || !SERVICE) {
  console.error("Falta TS_API_KEY, NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env");
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SERVICE, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const H = { "X-API-Key": TS_API_KEY, Accept: "application/json" };
const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

type Item = Record<string, any>;
type Wblock = { _id: string; name?: string; day: number; order?: number; isRest?: boolean; items?: Item[] };

async function tsGet<T>(path: string): Promise<T> {
  const r = await fetch(TS_BASE + path, { headers: H });
  if (!r.ok) throw new Error(`${path} → ${r.status}`);
  return r.json() as Promise<T>;
}

function horaDe(iso?: string): string {
  if (!iso) return "09:00";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "09:00";
  return d.toISOString().slice(11, 16);
}

function mapItem(it: Item, ejMap: Map<string, string>): Record<string, any> {
  const id = randomUUID();
  switch (it.type) {
    case "TASK": {
      const t = it.taskFields ?? {};
      return { id, tipo: "contenido", titulo: t.title ?? "Tarea", markdown: t.description ?? "" };
    }
    case "FORM": {
      const f = it.form ?? {};
      const qs = (f.questions ?? []).map((q: Item) => `- ${q.label ?? ""}`).join("\n");
      return { id, tipo: "contenido", titulo: f.name ?? "Formulario", markdown: qs };
    }
    case "REMINDER": {
      const r = it.reminderFields ?? {};
      return { id, tipo: "recordatorio", hora: horaDe(r.scheduledTime), mensaje: r.message ?? "" };
    }
    case "METRICS": {
      return { id, tipo: "metrica_prompt", metrica_tipo: "medidas" };
    }
    case "EXERCISE": {
      const ex = it.exercise ?? {};
      const ejId = ejMap.get(ex._id);
      const setsRaw: Item[] =
        (it.exerciseSets?.length ? it.exerciseSets : it.customerSets?.length ? it.customerSets : []) ?? [];
      const series = setsRaw.map((s: Item) => ({
        reps: String(s.reps ?? s.repetitions ?? s.targetReps ?? ""),
        peso: String(s.weight ?? s.kg ?? s.targetWeight ?? ""),
        ...(s.rir != null ? { rir: String(s.rir) } : {}),
        ...(s.rest != null ? { descanso: String(s.rest) } : {}),
      }));
      if (ejId) {
        return {
          id,
          tipo: "ejercicio",
          ejercicio_id: ejId,
          ejercicio_nombre: ex.name,
          series,
          ...(it.exerciseInstructions ? { notas: it.exerciseInstructions } : {}),
        };
      }
      return {
        id,
        tipo: "contenido",
        titulo: ex.name ?? "Ejercicio",
        markdown: it.exerciseInstructions || ex.defaultInstructions || "",
      };
    }
    case "CIRCUIT": {
      return { id, tipo: "contenido", titulo: `Circuito: ${it.circuitName ?? ""}`, markdown: "" };
    }
    default:
      return { id, tipo: "contenido", titulo: String(it.type ?? "Elemento"), markdown: "" };
  }
}

function construir(wblocks: Wblock[], ejMap: Map<string, string>) {
  const dias = wblocks.map((w) => w.day).filter((d) => typeof d === "number");
  const maxDay = dias.length ? Math.max(...dias) : 7;
  const numSemanas = Math.max(1, Math.ceil(maxDay / 7));
  const est = Array.from({ length: numSemanas }, (_, i) => ({
    semana: i + 1,
    dias: DIAS.map((nombre, j) => ({ dia: j + 1, titulo: nombre, descanso: false as boolean, bloques: [] as any[] })),
  }));

  const sorted = [...wblocks].sort((a, b) => a.day - b.day || (a.order ?? 0) - (b.order ?? 0));
  const conteo: Record<string, number> = {};
  for (const wb of sorted) {
    const dayIdx = wb.day - 1;
    if (dayIdx < 0) continue;
    const sem = Math.floor(dayIdx / 7);
    const di = dayIdx % 7;
    if (sem >= numSemanas) continue;
    const dia = est[sem]!.dias[di]!;
    if (wb.isRest && (wb.items ?? []).length === 0) {
      dia.descanso = true;
      continue;
    }
    const elementos = (wb.items ?? [])
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map((it) => {
        const el = mapItem(it, ejMap);
        conteo[el.tipo] = (conteo[el.tipo] ?? 0) + 1;
        return el;
      });
    dia.bloques.push({ id: randomUUID(), titulo: wb.name ?? "Bloque", elementos });
  }
  return { est, numSemanas, conteo };
}

async function main() {
  console.log(`Importar estructura de programas TS → mi-hub${DRY ? " (DRY-RUN)" : ""}\n`);

  // Mapa exercise._id (TS) → ejercicio.id (mi-hub)
  const { data: ejs } = await sb
    .from("ejercicios")
    .select("id, trainerstudio_id")
    .not("trainerstudio_id", "is", null);
  const ejMap = new Map<string, string>();
  for (const e of (ejs ?? []) as Array<{ id: string; trainerstudio_id: string }>) {
    ejMap.set(e.trainerstudio_id, e.id);
  }
  console.log(`Ejercicios enlazables por trainerstudio_id: ${ejMap.size}\n`);

  // Programas de mi-hub con trainerstudio_id
  const { data: progs } = await sb
    .from("programas")
    .select("id, nombre, trainerstudio_id, num_semanas")
    .not("trainerstudio_id", "is", null);

  for (const p of (progs ?? []) as Array<{
    id: string;
    nombre: string;
    trainerstudio_id: string;
    num_semanas: number;
  }>) {
    console.log(`== ${p.nombre} (TS ${p.trainerstudio_id}) ==`);
    let wblocks: Wblock[];
    try {
      wblocks = await tsGet<Wblock[]>(
        `/coach/programs/${p.trainerstudio_id}/wblock?startDay=0&endDay=400`
      );
    } catch (e) {
      console.log(`  ✗ No se pudo leer la estructura: ${e instanceof Error ? e.message : e}\n`);
      continue;
    }
    if (!Array.isArray(wblocks) || wblocks.length === 0) {
      console.log(`  · Sin wblocks (programa vacío en TS). Se omite.\n`);
      continue;
    }
    const { est, numSemanas, conteo } = construir(wblocks, ejMap);
    const diasConContenido = est.reduce(
      (a, s) => a + s.dias.filter((d) => d.bloques.length > 0).length,
      0
    );
    console.log(`  wblocks: ${wblocks.length} → ${numSemanas} semanas, ${diasConContenido} días con contenido`);
    console.log(`  elementos: ${JSON.stringify(conteo)}`);

    if (DRY) {
      console.log(`  (dry-run: no se escribe)\n`);
      continue;
    }
    const { error } = await sb
      .from("programas")
      .update({ estructura: est, num_semanas: numSemanas })
      .eq("id", p.id);
    if (error) console.log(`  ✗ Error al escribir: ${error.message}\n`);
    else console.log(`  ✓ Estructura escrita.\n`);
  }

  console.log("Hecho.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
