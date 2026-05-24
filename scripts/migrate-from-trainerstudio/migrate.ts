/**
 * Migración TrainerStudio → tu Supabase (v2).
 *
 * Reescrito tras descubrir el API real de TS con `npm run discover`:
 *   - Auth: cabecera `X-API-Key` (no `Authorization: Bearer`).
 *   - Paginación obligatoria en listados (`pageSize`, `pageNum`).
 *   - Estructura de respuesta `{ docs, totalDocs, totalPages, hasNextPage }`
 *     (Mongoose paginate v2).
 *   - Endpoints reales bajo `/coach/...` para clientas/programas, y
 *     `/exercises` para la biblioteca.
 *
 * USO:
 *   npm install
 *   cat > .env <<EOF
 *   TS_API_KEY=ts_ak_...
 *   TS_BASE=https://api.trainerstudio.io
 *   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ...
 *   EOF
 *
 *   npm run probe                        # verifica credenciales + endpoints
 *   npm run discover                     # vuelca shape de cada respuesta
 *   npm run migrate -- --dry-run         # qué pasaría sin escribir
 *   npm run migrate                      # migración real
 *   npm run migrate -- --only=ejercicios # solo una entidad
 *
 * QUÉ MIGRA:
 *   - ejercicios (con vídeo + imagen descargados a Storage)
 *   - clientas activas (no archivadas — usa --include-archived para todas)
 *   - notas (HTML)
 *   - métricas (valor inicial + valor actual por métrica)
 *   - sesiones (a partir del compliance diario)
 *
 * QUÉ NO MIGRA:
 *   - estructura de programas (TS no la expone vía API; recrear manualmente
 *     en mi-hub con el editor drag-drop — solo son 3)
 *   - fotos de progreso (todavía no encontrado el endpoint exacto)
 *
 * IDEMPOTENCIA:
 *   Cada fila lleva su `trainerstudio_id` en una columna del mismo nombre.
 *   Re-ejecutar el script actualiza filas existentes en lugar de duplicarlas.
 *   Requiere las migraciones SQL `20260524000006` y `20260524000007`.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { Buffer } from "node:buffer";

dotenv.config();

// ============================================================================
// Config & CLI args
// ============================================================================

const CONFIG = {
  TS_API_KEY: process.env.TS_API_KEY ?? "",
  TS_BASE: (process.env.TS_BASE ?? "https://api.trainerstudio.io").replace(
    /\/$/,
    ""
  ),
  SUPABASE_URL:
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "",
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  DRY_RUN: process.argv.includes("--dry-run"),
  PROBE: process.argv.includes("--probe"),
  SKIP_STORAGE: process.argv.includes("--skip-storage"),
  INCLUDE_ARCHIVED: process.argv.includes("--include-archived"),
  ONLY:
    process.argv.find((a) => a.startsWith("--only="))?.slice("--only=".length) ??
    null,
};

const ENTIDADES = [
  "ejercicios",
  "clientas",
  "programas",
  "notas",
  "metricas",
  "sesiones",
] as const;
type Entidad = (typeof ENTIDADES)[number];

const TS_ENDPOINTS = {
  exercises: (pageNum: number, pageSize = 100) =>
    `/exercises?pageSize=${pageSize}&pageNum=${pageNum}`,
  exerciseDetail: (id: string) => `/exercises/${id}`,
  customers: (archived: boolean, pageNum: number, pageSize = 100) =>
    `/coach/customers?archived=${archived}&pageSize=${pageSize}&pageNum=${pageNum}`,
  customer: (id: string) => `/coach/customers/${id}`,
  customerNotes: (id: string) => `/coach/customers/${id}/notes`,
  customerMetricsSets: (id: string) => `/coach/customers/${id}/metrics-sets`,
  customerCompliance: (id: string) => `/coach/customers/${id}/compliance`,
  programs: (archived: boolean, pageNum: number, pageSize = 100) =>
    `/coach/programs?archived=${archived}&pageSize=${pageSize}&pageNum=${pageNum}`,
};

// ============================================================================
// Helpers de log
// ============================================================================

const C = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  bold: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

function log(
  level: "info" | "ok" | "warn" | "err" | "dim",
  ...args: unknown[]
) {
  const icons = {
    info: `${C.cyan}·${C.reset}`,
    ok: `${C.green}✓${C.reset}`,
    warn: `${C.yellow}⚠${C.reset}`,
    err: `${C.red}✗${C.reset}`,
    dim: `${C.dim}·${C.reset}`,
  };
  const prefix = icons[level];
  const text = args
    .map((a) => (typeof a === "string" ? a : JSON.stringify(a)))
    .join(" ");
  if (level === "dim") {
    console.log(`${prefix} ${C.dim}${text}${C.reset}`);
  } else {
    console.log(`${prefix} ${text}`);
  }
}

// ============================================================================
// Cliente HTTP a Trainer Studio
// ============================================================================

async function tsGet<T = unknown>(path: string): Promise<T> {
  const url = CONFIG.TS_BASE + path;
  const res = await fetch(url, {
    headers: {
      "X-API-Key": CONFIG.TS_API_KEY,
      Accept: "application/json",
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `TS ${path} → ${res.status} ${res.statusText}\n${body.slice(0, 400)}`
    );
  }
  return res.json() as Promise<T>;
}

// Loop sobre paginación Mongoose: { docs, totalPages, hasNextPage, ... }
type Paginated<T> = {
  docs: T[];
  totalDocs: number;
  totalPages: number;
  page: number;
  hasNextPage: boolean;
};

async function tsPaginate<T>(
  urlFor: (pageNum: number) => string
): Promise<T[]> {
  const all: T[] = [];
  let page = 1;
  while (true) {
    const res = await tsGet<Paginated<T>>(urlFor(page));
    const docs = Array.isArray(res?.docs) ? res.docs : [];
    all.push(...docs);
    if (!res.hasNextPage) break;
    page += 1;
  }
  return all;
}

async function tsDownload(srcUrl: string): Promise<{
  buffer: Buffer;
  contentType: string;
} | null> {
  try {
    const res = await fetch(srcUrl);
    if (!res.ok) {
      log(
        "warn",
        `  Fallo al descargar (HTTP ${res.status}):`,
        srcUrl.slice(0, 80) + "…"
      );
      return null;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    const contentType =
      res.headers.get("content-type") ?? "application/octet-stream";
    return { buffer: buf, contentType };
  } catch (e) {
    log(
      "warn",
      "  Error al descargar:",
      e instanceof Error ? e.message : String(e)
    );
    return null;
  }
}

// ============================================================================
// Cliente Supabase service-role
// ============================================================================

let sbInst: SupabaseClient | null = null;
function sb(): SupabaseClient {
  if (sbInst) return sbInst;
  sbInst = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return sbInst;
}

async function obtenerCoachId(): Promise<string> {
  const { data, error } = await sb()
    .from("coaches")
    .select("id, email, nombre")
    .limit(2);
  if (error) throw new Error("No se pudo leer coaches: " + error.message);
  if (!data || data.length === 0) {
    throw new Error(
      "No hay ningún coach registrado. Crea cuenta en /login primero."
    );
  }
  if (data.length > 1) {
    throw new Error("Hay más de un coach. El script asume un único coach.");
  }
  log("dim", `Coach destino: ${data[0]!.nombre} <${data[0]!.email}>`);
  return data[0]!.id as string;
}

// ============================================================================
// Storage: descargar de TS y subir a un bucket
// ============================================================================

async function copiarAStorage(opts: {
  origenUrl: string;
  bucket: string;
  coachId: string;
  prefijo: string;
  ext?: string;
}): Promise<string | null> {
  if (CONFIG.SKIP_STORAGE) return opts.origenUrl;
  if (CONFIG.DRY_RUN) return `${opts.coachId}/[dry-run-${opts.prefijo}]`;

  const descarga = await tsDownload(opts.origenUrl);
  if (!descarga) return null;

  const ext = opts.ext ?? extDeContentType(descarga.contentType) ?? "bin";
  const nombre = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const path = `${opts.coachId}/${opts.prefijo}_${nombre}`;

  const { error } = await sb().storage.from(opts.bucket).upload(
    path,
    descarga.buffer,
    {
      contentType: descarga.contentType,
      upsert: false,
    }
  );
  if (error) {
    log("warn", `  Fallo subiendo a ${opts.bucket}: ${error.message}`);
    return null;
  }
  return path;
}

function extDeContentType(ct: string): string | null {
  if (ct.includes("jpeg")) return "jpg";
  if (ct.includes("png")) return "png";
  if (ct.includes("webp")) return "webp";
  if (ct.includes("mp4")) return "mp4";
  if (ct.includes("quicktime")) return "mov";
  if (ct.includes("webm")) return "webm";
  if (ct.includes("pdf")) return "pdf";
  return null;
}

// ============================================================================
// Tipos de Trainer Studio (basados en las muestras reales)
// ============================================================================

type TSMedia = {
  type: "video" | "image" | string;
  key: string;
  source: string;
  url: string;
};

type TSExercise = {
  _id: string;
  name: string;
  defaultInstructions?: string | null;
  videoLink?: string | null;
  tags?: string[];
  muscleGroups?: unknown[];
  media?: TSMedia[];
  image?: string | null;
  thumbnail?: string | null;
  imageKey?: string | null;
  companyId: string;
  createdAt: string;
  updatedAt: string;
};

type TSCustomer = {
  _id: string;
  name: string;
  surname?: string | null;
  email: string;
  phone?: string | null;
  birthday?: string | null;
  timezone?: string | null;
  role: string;
  companyId: string;
  createdAt: string;
  updatedAt: string;
  lastActivityDate?: string | null;
  profilePhotoUrl?: string | null;
  customerRoleData?: {
    isArchived?: boolean;
    groups?: string[];
    customerType?: string;
  };
};

type TSNote = {
  _id: string;
  customerId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

type TSMetricItem = {
  metric: {
    _id: string;
    name: string;
    metricUnit?: { _id: string; name: string; shortName: string };
  };
  initialValue: number | null;
  currentValue: number | null;
};

type TSMetricsSet = {
  _id: string;
  customerId: string;
  metricsSet: {
    _id: string;
    name: string;
  };
  metrics: TSMetricItem[];
  createdAt: string;
  updatedAt: string;
};

type TSCompliance = {
  customerId: string;
  totalWorkoutDays: number;
  completedWorkoutDays: number;
  workoutCompletionPercentage: number;
  dailyCompliance: Array<{
    date: string; // "YYYY-MM-DD"
    isWorkoutDay: boolean;
    isRestDay: boolean;
    isCompleted: boolean;
    totalItems: number;
    completedItems: number;
  }>;
};

type TSProgram = {
  _id: string;
  name: string;
  isArchived: boolean;
  numberOfDaysWithWorkouts?: number;
  createdAt: string;
  updatedAt: string;
};

// ============================================================================
// Clasificación de tags → grupos_musculares vs material
// ============================================================================

const EQUIPMENT_KEYWORDS = [
  "kettlebell",
  "mancuerna",
  "pesa",
  "barra",
  "banda",
  "goma",
  "trx",
  "bosu",
  "bicicleta",
  "cinta",
  "banco",
  "fitball",
  "pelota",
  "polea",
  "disco",
  "cuerda",
  "step",
  "esterilla",
  "rodillo",
];

function clasificarTags(tags: string[] | undefined): {
  grupos_musculares: string[];
  material: string[];
} {
  if (!tags || tags.length === 0) {
    return { grupos_musculares: [], material: [] };
  }
  const gm: string[] = [];
  const mat: string[] = [];
  for (const tag of tags) {
    const low = tag.toLowerCase();
    if (EQUIPMENT_KEYWORDS.some((k) => low.includes(k))) {
      mat.push(tag);
    } else {
      gm.push(tag);
    }
  }
  return { grupos_musculares: gm, material: mat };
}

// ============================================================================
// MIGRACIÓN: EJERCICIOS
// ============================================================================

async function migrarEjercicios(coachId: string): Promise<Map<string, string>> {
  console.log("");
  console.log(`${C.bold}${C.blue}== Ejercicios ==${C.reset}`);
  const idMap = new Map<string, string>(); // trainerstudio_id → uuid local

  log("info", "Descargando lista paginada de TS…");
  const ejs = await tsPaginate<TSExercise>((p) => TS_ENDPOINTS.exercises(p));
  log("ok", `${ejs.length} ejercicios encontrados en TS`);

  let creados = 0;
  let actualizados = 0;
  let i = 0;
  for (const ej of ejs) {
    i++;
    const nombre = (ej.name ?? "").trim() || "(sin nombre)";
    const { grupos_musculares, material } = clasificarTags(ej.tags);

    // Procesar media: el primer media de tipo video → video_url; image (top-level) → imagen_url
    let videoUrl: string | null = null;
    const videoMedia = (ej.media ?? []).find((m) => m.type === "video");
    if (videoMedia?.url) {
      const path = await copiarAStorage({
        origenUrl: videoMedia.url,
        bucket: "ejercicios-videos",
        coachId,
        prefijo: "video",
      });
      videoUrl = path;
    } else if (ej.videoLink) {
      videoUrl = ej.videoLink; // enlace externo (YouTube/Vimeo), guardar como-es
    }

    let imagenUrl: string | null = null;
    if (ej.image) {
      const path = await copiarAStorage({
        origenUrl: ej.image,
        bucket: "ejercicios-imagenes",
        coachId,
        prefijo: "img",
      });
      imagenUrl = path;
    }

    const row = {
      coach_id: coachId,
      trainerstudio_id: ej._id,
      nombre,
      instrucciones: ej.defaultInstructions ?? null,
      video_url: videoUrl,
      imagen_url: imagenUrl,
      grupos_musculares,
      material,
      origen: "creado_por_ti",
      actualizado_en: new Date().toISOString(),
    };

    if (CONFIG.DRY_RUN) {
      log(
        "dim",
        `[${i}/${ejs.length}] DRY: ${nombre.slice(0, 50)} (video=${videoUrl ? "sí" : "no"}, img=${imagenUrl ? "sí" : "no"})`
      );
      continue;
    }

    const { data, error } = await sb()
      .from("ejercicios")
      .upsert(row, { onConflict: "coach_id,trainerstudio_id" })
      .select("id")
      .single();

    if (error) {
      log("err", `  [${i}] ${nombre.slice(0, 40)}: ${error.message}`);
      continue;
    }
    idMap.set(ej._id, data!.id as string);
    if (i % 25 === 0) {
      log("ok", `  ${i}/${ejs.length} ejercicios procesados…`);
    }
    creados++; // upsert no diferencia, contamos como creados/actualizados
  }

  log("ok", `Ejercicios: ${creados} upserts (${ejs.length} totales)`);
  return idMap;
}

// ============================================================================
// MIGRACIÓN: CLIENTAS
// ============================================================================

async function migrarClientas(coachId: string): Promise<Map<string, string>> {
  console.log("");
  console.log(`${C.bold}${C.blue}== Clientas ==${C.reset}`);
  const idMap = new Map<string, string>();

  log(
    "info",
    `Descargando lista (${CONFIG.INCLUDE_ARCHIVED ? "incluye archivadas" : "solo activas"})…`
  );
  const activas = await tsPaginate<TSCustomer>((p) =>
    TS_ENDPOINTS.customers(false, p)
  );
  const archivadas = CONFIG.INCLUDE_ARCHIVED
    ? await tsPaginate<TSCustomer>((p) => TS_ENDPOINTS.customers(true, p))
    : [];
  const clientas = [...activas, ...archivadas];
  log("ok", `${clientas.length} clientas encontradas (${activas.length} activas + ${archivadas.length} archivadas)`);

  let i = 0;
  for (const c of clientas) {
    i++;
    const email = (c.email ?? "").toLowerCase().trim();
    if (!email) {
      log("warn", `  [${i}] ${c.name ?? "?"} sin email — saltando`);
      continue;
    }
    const nombre = (c.name ?? "").trim() || "(sin nombre)";
    const apellidos = c.surname?.trim() || null;
    const telefono = c.phone ? c.phone : null;
    const fechaNac = c.birthday
      ? new Date(c.birthday).toISOString().slice(0, 10)
      : null;
    const archivada = c.customerRoleData?.isArchived === true;

    const row = {
      coach_id: coachId,
      trainerstudio_id: c._id,
      nombre,
      apellidos,
      email,
      telefono,
      fecha_nacimiento: fechaNac,
      foto_url: null, // las URLs de TS caducan; clienta puede re-subir
      estado: archivada ? "archivada" : "activa",
      invitada_en: c.createdAt,
      creada_en: c.createdAt,
    };

    if (CONFIG.DRY_RUN) {
      log(
        "dim",
        `[${i}/${clientas.length}] DRY: ${nombre} ${apellidos ?? ""} <${email}> ${archivada ? "[archivada]" : ""}`
      );
      continue;
    }

    const { data, error } = await sb()
      .from("clientas")
      .upsert(row, { onConflict: "coach_id,trainerstudio_id" })
      .select("id")
      .single();

    if (error) {
      log(
        "err",
        `  [${i}] ${nombre} <${email}>: ${error.message.slice(0, 120)}`
      );
      continue;
    }
    idMap.set(c._id, data!.id as string);
    log("dim", `  ${nombre} ${apellidos ?? ""} → ${data!.id}`);
  }

  log("ok", `Clientas: ${idMap.size} upserts (${clientas.length} totales)`);
  return idMap;
}

// ============================================================================
// MIGRACIÓN: PROGRAMAS (solo cabecera — TS no expone la estructura por API)
// ============================================================================

async function migrarProgramas(coachId: string): Promise<void> {
  console.log("");
  console.log(`${C.bold}${C.blue}== Programas ==${C.reset}`);
  log(
    "warn",
    "TS no expone los wblocks/witems por API: se crean filas vacías con el nombre."
  );
  log("warn", "Recrear el contenido manualmente en el editor de mi-hub.");

  const progs = await tsPaginate<TSProgram>((p) =>
    TS_ENDPOINTS.programs(false, p)
  );
  log("ok", `${progs.length} programas encontrados`);

  for (const p of progs) {
    const nombre = (p.name ?? "").trim() || "(sin nombre)";
    const numSemanas = Math.max(
      1,
      Math.ceil((p.numberOfDaysWithWorkouts ?? 7) / 7)
    );
    const row = {
      coach_id: coachId,
      trainerstudio_id: p._id,
      nombre,
      descripcion: `Migrado desde Trainer Studio. ${p.numberOfDaysWithWorkouts ?? "?"} días con entreno. Recrear estructura manualmente.`,
      num_semanas: numSemanas,
      estructura: [],
      actualizado_en: new Date().toISOString(),
    };

    if (CONFIG.DRY_RUN) {
      log("dim", `  DRY: ${nombre} (${numSemanas} sem)`);
      continue;
    }

    const { error } = await sb()
      .from("programas")
      .upsert(row, { onConflict: "coach_id,trainerstudio_id" });
    if (error) {
      log("err", `  ${nombre}: ${error.message}`);
      continue;
    }
    log("ok", `  ${nombre} (${numSemanas} sem)`);
  }
}

// ============================================================================
// MIGRACIÓN: NOTAS
// ============================================================================

async function migrarNotas(
  coachId: string,
  clientasMap: Map<string, string>
): Promise<void> {
  console.log("");
  console.log(`${C.bold}${C.blue}== Notas ==${C.reset}`);
  let total = 0;
  let inserts = 0;

  for (const [tsCustomerId, clientaId] of clientasMap) {
    let notas: TSNote[];
    try {
      notas = await tsGet<TSNote[]>(TS_ENDPOINTS.customerNotes(tsCustomerId));
    } catch (e) {
      log(
        "warn",
        `  Sin notas para ${tsCustomerId}: ${e instanceof Error ? e.message.slice(0, 80) : e}`
      );
      continue;
    }
    if (!Array.isArray(notas) || notas.length === 0) continue;
    total += notas.length;

    for (const n of notas) {
      const row = {
        coach_id: coachId,
        clienta_id: clientaId,
        trainerstudio_id: n._id,
        contenido: n.content ?? "",
        creada_en: n.createdAt,
      };
      if (CONFIG.DRY_RUN) {
        log("dim", `  DRY: nota ${n._id.slice(0, 8)}… (${(n.content ?? "").length} chars)`);
        continue;
      }
      const { error } = await sb()
        .from("notas")
        .upsert(row, { onConflict: "coach_id,trainerstudio_id" });
      if (error) {
        log("err", `  Nota ${n._id}: ${error.message}`);
        continue;
      }
      inserts++;
    }
  }
  log("ok", `Notas: ${inserts}/${total} guardadas`);
}

// ============================================================================
// MIGRACIÓN: MÉTRICAS (initialValue + currentValue por métrica)
// ============================================================================

async function migrarMetricas(
  coachId: string,
  clientasMap: Map<string, string>
): Promise<void> {
  console.log("");
  console.log(`${C.bold}${C.blue}== Métricas ==${C.reset}`);
  let inserts = 0;
  const hoy = new Date().toISOString().slice(0, 10);

  for (const [tsCustomerId, clientaId] of clientasMap) {
    let sets: TSMetricsSet[];
    try {
      sets = await tsGet<TSMetricsSet[]>(
        TS_ENDPOINTS.customerMetricsSets(tsCustomerId)
      );
    } catch (e) {
      log(
        "warn",
        `  Sin métricas para ${tsCustomerId}: ${e instanceof Error ? e.message.slice(0, 80) : e}`
      );
      continue;
    }
    if (!Array.isArray(sets)) continue;

    for (const set of sets) {
      const fechaInicial = (set.createdAt ?? "").slice(0, 10) || hoy;

      for (const item of set.metrics ?? []) {
        const tipo = item.metric.name
          .toLowerCase()
          .normalize("NFD")
          .replace(/[̀-ͯ]/g, "")
          .replace(/[^a-z0-9]+/g, "_")
          .replace(/^_+|_+$/g, "");
        const unidad = item.metric.metricUnit?.shortName ?? "";

        // Valor inicial (fecha = creación del set)
        if (item.initialValue != null) {
          const trainerstudioId = `${set._id}_${item.metric._id}_initial`;
          const row = {
            coach_id: coachId,
            clienta_id: clientaId,
            trainerstudio_id: trainerstudioId,
            tipo,
            valor: item.initialValue,
            unidad,
            fecha: fechaInicial,
            notas: "Valor inicial migrado desde Trainer Studio",
          };
          if (!CONFIG.DRY_RUN) {
            const { error } = await sb()
              .from("metricas")
              .upsert(row, { onConflict: "coach_id,trainerstudio_id" });
            if (error) {
              log("err", `  ${tipo} inicial: ${error.message}`);
              continue;
            }
          }
          inserts++;
        }

        // Valor actual (fecha = hoy)
        if (item.currentValue != null) {
          const trainerstudioId = `${set._id}_${item.metric._id}_current`;
          const row = {
            coach_id: coachId,
            clienta_id: clientaId,
            trainerstudio_id: trainerstudioId,
            tipo,
            valor: item.currentValue,
            unidad,
            fecha: hoy,
            notas: "Último valor conocido (importado de Trainer Studio)",
          };
          if (!CONFIG.DRY_RUN) {
            const { error } = await sb()
              .from("metricas")
              .upsert(row, { onConflict: "coach_id,trainerstudio_id" });
            if (error) {
              log("err", `  ${tipo} actual: ${error.message}`);
              continue;
            }
          }
          inserts++;
        }
      }
    }
  }
  log("ok", `Métricas: ${inserts} upserts`);
}

// ============================================================================
// MIGRACIÓN: SESIONES (a partir de compliance diaria)
// ============================================================================

async function migrarSesiones(
  coachId: string,
  clientasMap: Map<string, string>
): Promise<void> {
  console.log("");
  console.log(`${C.bold}${C.blue}== Sesiones (compliance) ==${C.reset}`);
  let inserts = 0;

  for (const [tsCustomerId, clientaId] of clientasMap) {
    let compliance: TSCompliance;
    try {
      compliance = await tsGet<TSCompliance>(
        TS_ENDPOINTS.customerCompliance(tsCustomerId)
      );
    } catch (e) {
      log(
        "warn",
        `  Sin compliance para ${tsCustomerId}: ${e instanceof Error ? e.message.slice(0, 80) : e}`
      );
      continue;
    }
    const dias = compliance.dailyCompliance ?? [];

    for (const dia of dias) {
      if (!dia.isWorkoutDay) continue;
      const total = dia.totalItems || 0;
      const completed = dia.completedItems || 0;
      const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

      const row = {
        coach_id: coachId,
        clienta_id: clientaId,
        fecha: dia.date,
        completada: dia.isCompleted === true,
        porcentaje_completado: pct,
      };

      if (!CONFIG.DRY_RUN) {
        const { error } = await sb()
          .from("sesiones")
          .upsert(row, { onConflict: "clienta_id,fecha" });
        if (error) {
          log("err", `  Sesión ${dia.date}: ${error.message}`);
          continue;
        }
      }
      inserts++;
    }
    log("dim", `  ${tsCustomerId.slice(0, 8)}…: ${dias.length} días de compliance`);
  }
  log("ok", `Sesiones: ${inserts} upserts`);
}

// ============================================================================
// PROBE — verificación rápida
// ============================================================================

async function probe() {
  console.log("");
  console.log(`${C.bold}Probe: verificación rápida${C.reset}`);
  console.log("");

  const verificar = (cond: boolean, ok: string, ko: string) => {
    if (cond) log("ok", ok);
    else log("err", ko);
    return cond;
  };

  const okEnv =
    verificar(!!CONFIG.TS_API_KEY, "TS_API_KEY presente", "Falta TS_API_KEY") &&
    verificar(!!CONFIG.TS_BASE, `TS_BASE = ${CONFIG.TS_BASE}`, "Falta TS_BASE") &&
    verificar(
      !!CONFIG.SUPABASE_URL,
      "SUPABASE_URL presente",
      "Falta NEXT_PUBLIC_SUPABASE_URL o SUPABASE_URL"
    ) &&
    verificar(
      !!CONFIG.SUPABASE_SERVICE_ROLE_KEY,
      "SUPABASE_SERVICE_ROLE_KEY presente",
      "Falta SUPABASE_SERVICE_ROLE_KEY"
    );

  if (!okEnv) {
    console.log("");
    log("err", "Corrige el .env antes de seguir.");
    process.exit(1);
  }

  // 1) Supabase: coach
  try {
    const coachId = await obtenerCoachId();
    log("ok", `Coach destino encontrado: ${coachId.slice(0, 8)}…`);
  } catch (e) {
    log("err", e instanceof Error ? e.message : String(e));
    process.exit(1);
  }

  // 2) TS: listar primera página de cada entidad
  try {
    log("info", `GET ${CONFIG.TS_BASE}${TS_ENDPOINTS.exercises(1, 1)}`);
    const ex = await tsGet<Paginated<TSExercise>>(TS_ENDPOINTS.exercises(1, 1));
    log("ok", `Ejercicios disponibles en TS: ${ex.totalDocs}`);

    log("info", `GET /coach/customers (activas)`);
    const c = await tsGet<Paginated<TSCustomer>>(
      TS_ENDPOINTS.customers(false, 1, 1)
    );
    log("ok", `Clientas activas: ${c.totalDocs}`);

    log("info", `GET /coach/programs`);
    const pr = await tsGet<Paginated<TSProgram>>(
      TS_ENDPOINTS.programs(false, 1, 1)
    );
    log("ok", `Programas: ${pr.totalDocs}`);
  } catch (e) {
    log("err", e instanceof Error ? e.message : String(e));
    process.exit(1);
  }

  console.log("");
  log("ok", "Probe OK. Ya puedes ejecutar `npm run migrate -- --dry-run`.");
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log(
    `${C.bold}${C.magenta}Migración TrainerStudio → Supabase${C.reset}`
  );
  if (CONFIG.DRY_RUN) log("warn", "DRY-RUN — no se escribirá nada");
  if (CONFIG.SKIP_STORAGE) log("warn", "SKIP-STORAGE — se mantienen URLs originales de TS (caducan en 2h)");
  if (CONFIG.INCLUDE_ARCHIVED) log("info", "Incluyendo clientas archivadas");
  if (CONFIG.ONLY) log("info", `Solo entidad: ${CONFIG.ONLY}`);

  if (CONFIG.PROBE) {
    await probe();
    return;
  }

  if (
    !CONFIG.TS_API_KEY ||
    !CONFIG.TS_BASE ||
    !CONFIG.SUPABASE_URL ||
    !CONFIG.SUPABASE_SERVICE_ROLE_KEY
  ) {
    log("err", "Faltan variables de entorno. Ejecuta `npm run probe` para diagnóstico.");
    process.exit(1);
  }

  if (CONFIG.ONLY && !ENTIDADES.includes(CONFIG.ONLY as Entidad)) {
    log("err", `--only=${CONFIG.ONLY} no es válido. Opciones: ${ENTIDADES.join(", ")}`);
    process.exit(1);
  }

  const coachId = await obtenerCoachId();
  const run = (e: Entidad) => !CONFIG.ONLY || CONFIG.ONLY === e;

  // Necesitamos siempre el mapa de clientas para notas/métricas/sesiones,
  // así que si vamos a migrar alguna de ellas, primero migramos clientas
  // (o las recargamos del Supabase si --only=notas etc).
  let ejerciciosMap = new Map<string, string>();
  let clientasMap = new Map<string, string>();

  if (run("ejercicios")) {
    ejerciciosMap = await migrarEjercicios(coachId);
  }

  if (
    run("clientas") ||
    run("notas") ||
    run("metricas") ||
    run("sesiones")
  ) {
    if (run("clientas")) {
      clientasMap = await migrarClientas(coachId);
    } else {
      // Recargar el mapa desde Supabase para notas/métricas/sesiones
      const { data } = await sb()
        .from("clientas")
        .select("id, trainerstudio_id")
        .eq("coach_id", coachId)
        .not("trainerstudio_id", "is", null);
      for (const r of data ?? []) {
        clientasMap.set(r.trainerstudio_id as string, r.id as string);
      }
      log("dim", `Cargadas ${clientasMap.size} clientas existentes`);
    }
  }

  if (run("programas")) await migrarProgramas(coachId);
  if (run("notas")) await migrarNotas(coachId, clientasMap);
  if (run("metricas")) await migrarMetricas(coachId, clientasMap);
  if (run("sesiones")) await migrarSesiones(coachId, clientasMap);

  console.log("");
  log("ok", "Migración terminada.");
  if (CONFIG.DRY_RUN) {
    log("warn", "Era DRY-RUN. Quita --dry-run para escribir de verdad.");
  } else {
    console.log("");
    log(
      "info",
      "Recordatorio: borra el .env o rota TS_API_KEY y SUPABASE_SERVICE_ROLE_KEY."
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
