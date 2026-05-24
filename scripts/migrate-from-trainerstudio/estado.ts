/**
 * Estado de la migración: cuenta lo que hay en Supabase y muestra un
 * informe rápido. Útil tras un `npm run migrate` para ver qué entró y
 * qué falta.
 *
 * Uso:
 *   npm run estado
 */

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Falta SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env");
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const C = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
};

function pct(parte: number, total: number): string {
  if (total === 0) return "0%";
  return `${Math.round((parte / total) * 100)}%`;
}

async function main() {
  console.log(`${C.bold}${C.magenta}Estado de la migración${C.reset}\n`);

  // === EJERCICIOS ===
  const { count: ejTotal } = await sb
    .from("ejercicios")
    .select("id", { count: "exact", head: true });

  const { count: ejConTS } = await sb
    .from("ejercicios")
    .select("id", { count: "exact", head: true })
    .not("trainerstudio_id", "is", null);

  const { count: ejConVideo } = await sb
    .from("ejercicios")
    .select("id", { count: "exact", head: true })
    .not("trainerstudio_id", "is", null)
    .not("video_url", "is", null);

  const { count: ejConImg } = await sb
    .from("ejercicios")
    .select("id", { count: "exact", head: true })
    .not("trainerstudio_id", "is", null)
    .not("imagen_url", "is", null);

  console.log(`${C.bold}${C.blue}Ejercicios${C.reset}`);
  console.log(`  Total en BD:           ${ejTotal ?? 0}`);
  console.log(`  Migrados desde TS:     ${ejConTS ?? 0} / 268 (${pct(ejConTS ?? 0, 268)})`);
  console.log(`  Con vídeo:             ${ejConVideo ?? 0} / ${ejConTS ?? 0} (${pct(ejConVideo ?? 0, ejConTS ?? 0)})`);
  console.log(`  Con imagen:            ${ejConImg ?? 0} / ${ejConTS ?? 0} (${pct(ejConImg ?? 0, ejConTS ?? 0)})`);
  const ejSinVideo = (ejConTS ?? 0) - (ejConVideo ?? 0);
  if (ejSinVideo > 0) {
    console.log(`  ${C.yellow}⚠ Sin vídeo:           ${ejSinVideo}${C.reset} (probablemente porque el vídeo era >50MB o falló descarga)`);
  }

  // Mostrar los ejercicios sin vídeo (hasta 10)
  if (ejSinVideo > 0) {
    const { data: sinVideo } = await sb
      .from("ejercicios")
      .select("nombre, trainerstudio_id")
      .not("trainerstudio_id", "is", null)
      .is("video_url", null)
      .limit(20);
    if (sinVideo && sinVideo.length > 0) {
      console.log(`\n  ${C.dim}Ejercicios sin vídeo (primeros ${sinVideo.length}):${C.reset}`);
      for (const e of sinVideo) {
        console.log(`    · ${(e.nombre as string).slice(0, 70)}`);
      }
    }
  }

  // === CLIENTAS ===
  const { count: clTotal } = await sb
    .from("clientas")
    .select("id", { count: "exact", head: true });
  const { count: clConTS } = await sb
    .from("clientas")
    .select("id", { count: "exact", head: true })
    .not("trainerstudio_id", "is", null);
  const { count: clArchivadas } = await sb
    .from("clientas")
    .select("id", { count: "exact", head: true })
    .eq("estado", "archivada");

  console.log(`\n${C.bold}${C.blue}Clientas${C.reset}`);
  console.log(`  Total en BD:           ${clTotal ?? 0}`);
  console.log(`  Migradas desde TS:     ${clConTS ?? 0}`);
  console.log(`  Archivadas:            ${clArchivadas ?? 0}`);

  // === PROGRAMAS ===
  const { count: progTotal } = await sb
    .from("programas")
    .select("id", { count: "exact", head: true });
  const { count: progConTS } = await sb
    .from("programas")
    .select("id", { count: "exact", head: true })
    .not("trainerstudio_id", "is", null);

  console.log(`\n${C.bold}${C.blue}Programas${C.reset}`);
  console.log(`  Total en BD:           ${progTotal ?? 0}`);
  console.log(`  Migrados desde TS:     ${progConTS ?? 0} ${C.dim}(solo cabecera — wblocks/witems los recreas a mano)${C.reset}`);

  // === NOTAS ===
  const { count: notasTotal } = await sb
    .from("notas")
    .select("id", { count: "exact", head: true });
  const { count: notasConTS } = await sb
    .from("notas")
    .select("id", { count: "exact", head: true })
    .not("trainerstudio_id", "is", null);

  console.log(`\n${C.bold}${C.blue}Notas${C.reset}`);
  console.log(`  Total en BD:           ${notasTotal ?? 0}`);
  console.log(`  Migradas desde TS:     ${notasConTS ?? 0}`);

  // === MÉTRICAS ===
  const { count: metTotal } = await sb
    .from("metricas")
    .select("id", { count: "exact", head: true });
  const { count: metConTS } = await sb
    .from("metricas")
    .select("id", { count: "exact", head: true })
    .not("trainerstudio_id", "is", null);

  console.log(`\n${C.bold}${C.blue}Métricas${C.reset}`);
  console.log(`  Total en BD:           ${metTotal ?? 0}`);
  console.log(`  Migradas desde TS:     ${metConTS ?? 0}`);

  // === SESIONES ===
  const { count: sesTotal } = await sb
    .from("sesiones")
    .select("id", { count: "exact", head: true });
  const { count: sesCompletadas } = await sb
    .from("sesiones")
    .select("id", { count: "exact", head: true })
    .eq("completada", true);

  console.log(`\n${C.bold}${C.blue}Sesiones${C.reset}`);
  console.log(`  Total en BD:           ${sesTotal ?? 0}`);
  console.log(`  Completadas:           ${sesCompletadas ?? 0} / ${sesTotal ?? 0} (${pct(sesCompletadas ?? 0, sesTotal ?? 0)})`);

  // === STORAGE ===
  console.log(`\n${C.bold}${C.blue}Storage${C.reset}`);
  for (const bucket of ["ejercicios-videos", "ejercicios-imagenes"]) {
    const { data: archivos } = await sb.storage.from(bucket).list("", {
      limit: 1000,
    });
    let totalBucket = 0;
    if (archivos) {
      // Listar también subcarpetas (cada coach tiene la suya)
      for (const item of archivos) {
        if (!item.id) {
          const { data: sub } = await sb.storage
            .from(bucket)
            .list(item.name, { limit: 1000 });
          totalBucket += sub?.length ?? 0;
        } else {
          totalBucket += 1;
        }
      }
    }
    console.log(`  ${bucket.padEnd(22)} ${totalBucket} archivos`);
  }

  // === RESUMEN ===
  console.log(`\n${C.bold}Resumen${C.reset}`);
  if (
    (ejConTS ?? 0) === 268 &&
    (clConTS ?? 0) >= 8 &&
    (progConTS ?? 0) === 3
  ) {
    console.log(`${C.green}✓ Migración aparentemente completa.${C.reset}`);
  } else {
    console.log(`${C.yellow}⚠ Faltan datos. Re-ejecuta 'npm run migrate' (es idempotente).${C.reset}`);
    if ((ejConTS ?? 0) < 268) {
      console.log(`  · Ejercicios: ${ejConTS}/268`);
    }
    if ((clConTS ?? 0) < 8) {
      console.log(`  · Clientas activas: ${clConTS}/8`);
    }
    if ((progConTS ?? 0) < 3) {
      console.log(`  · Programas: ${progConTS}/3`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
