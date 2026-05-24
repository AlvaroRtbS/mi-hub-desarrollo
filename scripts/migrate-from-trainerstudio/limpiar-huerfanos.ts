/**
 * Limpieza de archivos huérfanos en Storage.
 *
 * Detecta archivos en `ejercicios-videos` y `ejercicios-imagenes` que NO
 * están referenciados por ningún `ejercicios.video_url` / `imagen_url`
 * de la BD. Suelen quedar tras ejecuciones de migración que fallaron a
 * mitad (el upload de Storage funcionó pero el upsert de la fila falló).
 *
 * MODOS (uno es obligatorio):
 *   npm run limpiar-huerfanos -- --dry-run     # lista qué borraría, no toca nada
 *   npm run limpiar-huerfanos -- --confirmar   # borra de verdad
 *
 * Sin flag, no hace nada (por seguridad).
 *
 * Solo procesa esos dos buckets. Otros buckets (fotos-progreso, etc.)
 * NO se tocan.
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

const DRY_RUN = process.argv.includes("--dry-run");
const CONFIRMAR = process.argv.includes("--confirmar");

if (!DRY_RUN && !CONFIRMAR) {
  console.error(
    "\n⚠ Tienes que pasar UNA de estas flags:\n" +
      "    --dry-run     muestra qué borraría sin tocar nada\n" +
      "    --confirmar   borra de verdad\n"
  );
  process.exit(1);
}

if (DRY_RUN && CONFIRMAR) {
  console.error(
    "Pasa solo --dry-run O --confirmar, no las dos a la vez."
  );
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
  cyan: "\x1b[36m",
};

type ArchivoStorage = {
  path: string; // ej: "d0d7f501-.../video_1772...mp4"
  size: number; // bytes
};

// Lista recursiva (storage tiene subcarpetas por coach_id)
async function listarBucketRecursivo(bucket: string): Promise<ArchivoStorage[]> {
  const todos: ArchivoStorage[] = [];

  // Listar el nivel raíz: cada subitem sin id es una "carpeta" (prefijo)
  const { data: raiz, error: errRaiz } = await sb.storage.from(bucket).list("", {
    limit: 1000,
  });
  if (errRaiz) {
    throw new Error(`No se pudo listar ${bucket}: ${errRaiz.message}`);
  }

  for (const item of raiz ?? []) {
    if (item.id) {
      // Archivo en raíz (raro pero posible)
      todos.push({
        path: item.name,
        size: (item.metadata as { size?: number } | null)?.size ?? 0,
      });
    } else {
      // Es carpeta (coach_id), listar dentro
      const { data: sub } = await sb.storage.from(bucket).list(item.name, {
        limit: 1000,
      });
      for (const f of sub ?? []) {
        if (f.id) {
          todos.push({
            path: `${item.name}/${f.name}`,
            size: (f.metadata as { size?: number } | null)?.size ?? 0,
          });
        }
      }
    }
  }

  return todos;
}

function formatearBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

async function procesarBucket(
  bucket: string,
  columnaReferencia: "video_url" | "imagen_url"
): Promise<{
  totalArchivos: number;
  referenciados: number;
  huerfanos: ArchivoStorage[];
  bytesHuerfanos: number;
}> {
  console.log(`\n${C.bold}${C.cyan}== ${bucket} ==${C.reset}`);

  // 1) Listar archivos
  const archivos = await listarBucketRecursivo(bucket);
  console.log(`  ${archivos.length} archivos en Storage`);

  // 2) Sacar paths referenciados desde ejercicios
  const { data: filas, error } = await sb
    .from("ejercicios")
    .select(columnaReferencia)
    .not(columnaReferencia, "is", null);
  if (error) throw new Error("Leyendo ejercicios: " + error.message);

  const referenciados = new Set<string>();
  for (const r of (filas ?? []) as Array<Record<string, string | null>>) {
    const v = r[columnaReferencia];
    if (typeof v === "string" && v) referenciados.add(v);
  }
  console.log(`  ${referenciados.size} referenciados desde la tabla ejercicios`);

  // 3) Calcular huérfanos
  const huerfanos = archivos.filter((a) => !referenciados.has(a.path));
  const bytesHuerfanos = huerfanos.reduce((s, a) => s + a.size, 0);

  console.log(
    `  ${C.yellow}${huerfanos.length} huérfanos${C.reset} (${formatearBytes(bytesHuerfanos)} a recuperar)`
  );

  // Mostrar primeros 10
  if (huerfanos.length > 0) {
    console.log(`\n  ${C.dim}Primeros ${Math.min(10, huerfanos.length)} huérfanos:${C.reset}`);
    for (const h of huerfanos.slice(0, 10)) {
      console.log(
        `    · ${formatearBytes(h.size).padStart(10)}  ${h.path}`
      );
    }
    if (huerfanos.length > 10) {
      console.log(`    ${C.dim}... y ${huerfanos.length - 10} más${C.reset}`);
    }
  }

  return {
    totalArchivos: archivos.length,
    referenciados: referenciados.size,
    huerfanos,
    bytesHuerfanos,
  };
}

async function borrarHuerfanos(bucket: string, paths: string[]): Promise<number> {
  if (paths.length === 0) return 0;
  // remove() acepta arrays; lo hacemos en chunks por si acaso (max 1000)
  const CHUNK = 100;
  let borrados = 0;
  for (let i = 0; i < paths.length; i += CHUNK) {
    const trozo = paths.slice(i, i + CHUNK);
    const { error } = await sb.storage.from(bucket).remove(trozo);
    if (error) {
      console.error(
        `  ${C.red}Error borrando lote ${i / CHUNK + 1}: ${error.message}${C.reset}`
      );
      continue;
    }
    borrados += trozo.length;
    process.stdout.write(
      `  Borrados ${borrados}/${paths.length}...\r`
    );
  }
  process.stdout.write("\n");
  return borrados;
}

async function main() {
  console.log(`${C.bold}Limpieza de archivos huérfanos${C.reset}`);
  console.log(
    DRY_RUN
      ? `${C.dim}Modo: DRY-RUN (no se borra nada)${C.reset}`
      : `${C.bold}${C.red}Modo: BORRADO REAL${C.reset}`
  );

  const resultadoVideos = await procesarBucket("ejercicios-videos", "video_url");
  const resultadoImgs = await procesarBucket("ejercicios-imagenes", "imagen_url");

  const totalHuerfanos =
    resultadoVideos.huerfanos.length + resultadoImgs.huerfanos.length;
  const totalBytes =
    resultadoVideos.bytesHuerfanos + resultadoImgs.bytesHuerfanos;

  console.log(`\n${C.bold}Resumen${C.reset}`);
  console.log(
    `  Total huérfanos: ${totalHuerfanos} archivos (${formatearBytes(totalBytes)})`
  );

  if (totalHuerfanos === 0) {
    console.log(`  ${C.green}✓ Nada que borrar.${C.reset}`);
    return;
  }

  if (DRY_RUN) {
    console.log("");
    console.log(
      `${C.yellow}Para borrar de verdad:${C.reset} npm run limpiar-huerfanos -- --confirmar`
    );
    return;
  }

  // CONFIRMAR mode
  console.log(`\n${C.bold}${C.red}Procediendo a borrar...${C.reset}`);
  const b1 = await borrarHuerfanos(
    "ejercicios-videos",
    resultadoVideos.huerfanos.map((h) => h.path)
  );
  const b2 = await borrarHuerfanos(
    "ejercicios-imagenes",
    resultadoImgs.huerfanos.map((h) => h.path)
  );

  console.log(
    `\n${C.green}✓ Borrados ${b1 + b2}/${totalHuerfanos} archivos (${formatearBytes(totalBytes)} liberados).${C.reset}`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
