import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
config();

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

async function main() {
  console.log("=== imagen_url / video_url valor real ===");
  const { data: ej } = await sb.from("ejercicios")
    .select("nombre, imagen_url, video_url").not("imagen_url", "is", null).limit(2);
  for (const e of ej ?? []) {
    console.log("img:", e.imagen_url);
    console.log("vid:", e.video_url);
  }

  console.log("\n=== fotos_progreso (la única) ===");
  const { data: f } = await sb.from("fotos_progreso").select("clienta_id, tipo, url, fecha");
  console.log(JSON.stringify(f, null, 2));

  console.log("\n=== metricas por tipo ===");
  const { data: m } = await sb.from("metricas").select("tipo, clienta_id");
  const porTipo: Record<string, number> = {};
  const porCl: Record<string, number> = {};
  for (const r of m ?? []) { porTipo[r.tipo] = (porTipo[r.tipo] ?? 0) + 1; porCl[r.clienta_id] = (porCl[r.clienta_id] ?? 0) + 1; }
  console.log("por tipo:", porTipo);
  console.log("nº clientas con métricas:", Object.keys(porCl).length);

  console.log("\n=== sesiones por clienta (completadas/total) ===");
  const { data: ses } = await sb.from("sesiones").select("clienta_id, completada");
  const sc: Record<string, { t: number; c: number }> = {};
  for (const s of ses ?? []) { sc[s.clienta_id] ??= { t: 0, c: 0 }; sc[s.clienta_id].t++; if (s.completada) sc[s.clienta_id].c++; }
  for (const [cl, v] of Object.entries(sc)) console.log(`  ${cl}  total=${v.t} completadas=${v.c}`);

  console.log("\n=== Tipos de elemento en el programa 12 semanas (¿circuitos?) ===");
  const { data: p } = await sb.from("programas")
    .select("estructura").eq("nombre", "Pérdida de peso (12 semanas) - FINAL").single();
  const tipos: Record<string, number> = {};
  let conSuperset = 0, sample: any = null;
  for (const sem of (p?.estructura ?? [])) for (const d of (sem.dias ?? [])) for (const b of (d.bloques ?? [])) for (const el of (b.elementos ?? [])) {
    tipos[el.tipo] = (tipos[el.tipo] ?? 0) + 1;
    if (el.tipo === "circuito" || el.supersetExercises || el.ejercicios) { conSuperset++; if (!sample) sample = el; }
  }
  console.log("tipos de elemento:", tipos);
  console.log("elementos tipo circuito/superset:", conSuperset);
  if (sample) console.log("muestra:", JSON.stringify(sample).slice(0, 400));

  // ¿Hay bloques con >1 ejercicio (posible circuito aplanado)?
  let bloquesMultiEj = 0;
  for (const sem of (p?.estructura ?? [])) for (const d of (sem.dias ?? [])) for (const b of (d.bloques ?? [])) {
    const nEj = (b.elementos ?? []).filter((e: any) => e.tipo === "ejercicio").length;
    if (nEj > 1) bloquesMultiEj++;
  }
  console.log("bloques con >1 ejercicio (posibles circuitos aplanados):", bloquesMultiEj);
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
