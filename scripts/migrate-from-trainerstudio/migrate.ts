/**
 * Migración TrainerStudio → tu Supabase.
 *
 * USO:
 *   npm install
 *   cp .env.example .env  (rellenar las claves)
 *   npm run probe                       # un primer ping para verificar credenciales y endpoints
 *   npm run migrate -- --dry-run        # ver qué pasaría sin escribir
 *   npm run migrate                     # migración real
 *   npm run migrate -- --only=ejercicios   # solo una entidad
 *   npm run migrate -- --skip-storage   # mantener URLs originales de TS (rápido, prueba)
 *
 * IDEMPOTENCIA:
 *   Cada fila migrada lleva su trainerstudio_id en una columna del mismo
 *   nombre. Reejecutar el script actualiza filas existentes en lugar de
 *   duplicarlas (upsert con on conflict).
 *
 * ENDPOINTS DE TRAINERSTUDIO:
 *   Los paths en TS_ENDPOINTS son la mejor hipótesis basada en la
 *   documentación interna y los nombres de las herramientas MCP. Si tu API
 *   real usa paths distintos, ajústalos en el bloque TS_ENDPOINTS al
 *   principio de este archivo, o ejecuta `--probe` para verificar.
 *
 * ⚠ Antes de ejecutar la migración real:
 *   1. Haz una copia de seguridad en Supabase (Backups).
 *   2. Ejecuta con --dry-run primero.
 *   3. Revisa el resumen final.
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
  ONLY:
    process.argv.find((a) => a.startsWith("--only="))?.slice("--only=".length) ??
    null,
};

const TS_ENDPOINTS = {
  exercises: "/exercises", // ?type=my para los propios del coach
  customers: "/customers",
  customer: (id: string) => `/customers/${id}`,
  programs: "/programs",
  program: (id: string) => `/programs/${id}`,
  customerMetrics: (id: string) => `/customers/${id}/metrics`,
  customerCompliance: (id: string) => `/customers/${id}/compliance`,
  customerWorkouts: (id: string) => `/customers/${id}/workouts`,
  customerPhotos: (id: string) => `/customers/${id}/photos`,
  customerNotes: (id: string) => `/customers/${id}/notes`,
  exerciseHistory: (customerId: string, exerciseId: string) =>
    `/customers/${customerId}/exercises/${exerciseId}/history`,
};

const ENTIDADES = [
  "ejercicios",
  "clientas",
  "programas",
  "metricas",
  "sesiones",
  "fotos",
  "notas",
] as const;
type Entidad = (typeof ENTIDADES)[number];

// ============================================================================
// Logging con color
// ============================================================================

const C = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  bold: "\x1b[1m",
};

function log(level: "info" | "ok" | "warn" | "err" | "dim", ...args: unknown[]) {
  const color =
    level === "ok"
      ? C.green
      : level === "warn"
      ? C.yellow
      : level === "err"
      ? C.red
      : level === "dim"
      ? C.dim
      : C.cyan;
  const tag =
    level === "ok"
      ? "✓"
      : level === "warn"
      ? "⚠"
      : level === "err"
      ? "✗"
      : level === "dim"
      ? " "
      : "·";
  console.log(`${color}${tag}${C.reset}`, ...args);
}

function seccion(titulo: string) {
  console.log("");
  console.log(`${C.bold}${C.blue}━━ ${titulo} ━━${C.reset}`);
}

// ============================================================================
// HTTP cliente para TrainerStudio
// ============================================================================

async function tsGet(path: string, query?: Record<string, string>): Promise<unknown> {
  const url = new URL(CONFIG.TS_BASE + path);
  if (query) {
    for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v);
  }
  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${CONFIG.TS_API_KEY}`,
      Accept: "application/json",
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `TS ${path} → ${res.status} ${res.statusText}\n${body.slice(0, 400)}`
    );
  }
  return res.json();
}

async function tsDownload(srcUrl: string): Promise<{
  buffer: Buffer;
  contentType: string;
} | null> {
  try {
    const res = await fetch(srcUrl);
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    const contentType = res.headers.get("content-type") ?? "application/octet-stream";
    return { buffer: buf, contentType };
  } catch (e) {
    log("warn", "  Fallo al descargar", srcUrl, e instanceof Error ? e.message : e);
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
  // Asumimos que la BD tiene exactamente un coach: el dueño.
  // Si hubiera varios, requeriríamos un flag --coach-id.
  const { data, error } = await sb()
    .from("coaches")
    .select("id, email, nombre")
    .limit(2);
  if (error) throw new Error("No se pudo leer coaches: " + error.message);
  if (!data || data.length === 0) {
    throw new Error(
      "No hay ningún coach registrado en tu Supabase. Crea cuenta primero entrando en /login de tu web."
    );
  }
  if (data.length > 1) {
    throw new Error(
      "Hay más de un coach en la BD. Este script asume un único coach por instalación."
    );
  }
  log(
    "dim",
    `Coach destino: ${data[0]!.nombre} <${data[0]!.email}> (${data[0]!.id})`
  );
  return data[0]!.id;
}

// ============================================================================
// Helper: descargar de TS y subir a Supabase Storage
// ============================================================================

async function copiarArchivoAStorage(opts: {
  origenUrl: string;
  bucket: string;
  coachId: string;
  prefijo: string; // ej "exercise" o "photo"
  ext?: string;
}): Promise<string | null> {
  if (CONFIG.SKIP_STORAGE) return opts.origenUrl;
  if (CONFIG.DRY_RUN) return `${opts.coachId}/[dry-run-${opts.prefijo}]`;

  const descarga = await tsDownload(opts.origenUrl);
  if (!descarga) return null;

  const ext = opts.ext ?? extDeContentType(descarga.contentType) ?? "bin";
  const nombre = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const path = `${opts.coachId}/${opts.prefijo}_${nombre}`;

  const { error } = await sb()
    .storage.from(opts.bucket)
    .upload(path, descarga.buffer, {
      contentType: descarga.contentType,
      upsert: false,
    });
  if (error) {
    log("warn", `  Fallo al subir a ${opts.bucket}: ${error.message}`);
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
// MAPPERS — del schema TS al schema local
// ============================================================================

type TSExercise = {
  id: string;
  name: string;
  description?: string | null;
  instructions?: string | null;
  type?: "private" | "public" | string;
  image?: string | null;
  imageUrl?: string | null;
  videoUrl?: string | null;
  video?: string | null;
  muscleGroups?: string[];
  equipment?: string[];
};

type TSCustomer = {
  id: string;
  name: string;
  surname?: string | null;
  email: string;
  phone?: string | null;
  birthday?: string | null;
  profilePhotoUrl?: string | null;
  isArchived?: boolean;
};

type TSProgram = {
  id: string;
  name: string;
  description?: string | null;
  numberOfDaysWithWorkouts?: number;
  workoutBlocks?: TSWorkoutBlock[];
  isArchived?: boolean;
};

type TSWorkoutBlock = {
  id: string;
  day: number; // 1-based, absoluto (día 1 del programa = sem 1 día 1)
  isRest?: boolean;
  order?: number;
  name?: string;
  items?: TSWorkoutItem[];
};

type TSWorkoutItem = {
  id: string;
  type: "EXERCISE" | "TASK" | string;
  exerciseId?: string | null;
  exerciseName?: string | null;
  sets?: Array<{
    reps?: string | number;
    weight?: string | number;
    rir?: string | number;
    rest?: string | number;
    tempo?: string;
    notes?: string;
  }>;
  supersetExercises?: TSWorkoutItem[];
  taskFields?: {
    title?: string;
    description?: string;
    media?: Array<{ type: string; url: string; source?: string }>;
  };
};

function ejercicioATS(coachId: string) {
  return (e: TSExercise) => {
    return {
      coach_id: coachId,
      nombre: e.name?.trim() || "Ejercicio",
      descripcion: e.description ?? null,
      instrucciones: e.instructions ?? null,
      grupos_musculares: e.muscleGroups ?? [],
      material: e.equipment ?? [],
      origen: "trainerstudio",
      trainerstudio_id: e.id,
      // imagen_url / video_url se rellenan después al subir a Storage
    };
  };
}

function clientaATS(coachId: string) {
  return (c: TSCustomer) => {
    return {
      coach_id: coachId,
      nombre: (c.name ?? "").trim() || "Sin nombre",
      apellidos: c.surname ?? null,
      email: c.email,
      telefono: c.phone ?? null,
      fecha_nacimiento: c.birthday ?? null,
      foto_url: c.profilePhotoUrl ?? null,
      estado: c.isArchived ? "archivada" : "activa",
      trainerstudio_id: c.id,
    };
  };
}

// Mapeo del programa TS a nuestra estructura: workoutBlocks (con day absoluto)
// se agrupan en semanas de 7 días.
function programaATS(coachId: string, mapeoEjercicios: Map<string, string>) {
  return (p: TSProgram) => {
    const numDias =
      p.numberOfDaysWithWorkouts ??
      (p.workoutBlocks && p.workoutBlocks.length > 0
        ? Math.max(...p.workoutBlocks.map((b) => b.day))
        : 7);
    const numSemanas = Math.max(1, Math.ceil(numDias / 7));

    // Inicializar estructura vacía
    type Bloque = {
      id: string;
      titulo: string;
      indicaciones?: string;
      elementos: Array<Record<string, unknown>>;
    };
    type Dia = {
      dia: number;
      titulo: string;
      descanso: boolean;
      bloques: Bloque[];
    };
    type Semana = { semana: number; dias: Dia[] };
    const NOMBRES_DIAS = [
      "Lunes",
      "Martes",
      "Miércoles",
      "Jueves",
      "Viernes",
      "Sábado",
      "Domingo",
    ];
    const estructura: Semana[] = Array.from({ length: numSemanas }, (_, i) => ({
      semana: i + 1,
      dias: NOMBRES_DIAS.map((titulo, j) => ({
        dia: j + 1,
        titulo,
        descanso: j >= 5,
        bloques: [],
      })),
    }));

    // Ordenar wblocks por (day, order)
    const wblocks = [...(p.workoutBlocks ?? [])].sort((a, b) => {
      if (a.day !== b.day) return a.day - b.day;
      return (a.order ?? 0) - (b.order ?? 0);
    });

    for (const wb of wblocks) {
      const semIdx = Math.floor((wb.day - 1) / 7);
      const diaIdx = (wb.day - 1) % 7;
      if (semIdx < 0 || semIdx >= estructura.length) continue;
      const dia = estructura[semIdx]!.dias[diaIdx]!;
      if (wb.isRest) {
        dia.descanso = true;
        continue;
      }
      dia.descanso = false;
      const bloque: Bloque = {
        id: wb.id,
        titulo: wb.name ?? "Bloque",
        elementos: [],
      };
      for (const item of wb.items ?? []) {
        const els = mapeoItemAElementos(item, mapeoEjercicios);
        bloque.elementos.push(...els);
      }
      dia.bloques.push(bloque);
    }

    return {
      coach_id: coachId,
      nombre: p.name?.trim() || "Programa",
      descripcion: p.description ?? null,
      num_semanas: numSemanas,
      estructura,
      trainerstudio_id: p.id,
    };
  };
}

function mapeoItemAElementos(
  item: TSWorkoutItem,
  mapeoEjercicios: Map<string, string>
): Array<Record<string, unknown>> {
  if (item.type === "EXERCISE" && item.exerciseId) {
    const ejercicioId = mapeoEjercicios.get(item.exerciseId);
    if (!ejercicioId) {
      log(
        "warn",
        `  Item EXERCISE con exerciseId=${item.exerciseId} no encontrado en mapeo (se omite).`
      );
      return [];
    }
    const elementos: Array<Record<string, unknown>> = [
      {
        id: item.id,
        tipo: "ejercicio",
        ejercicio_id: ejercicioId,
        ejercicio_nombre: item.exerciseName ?? undefined,
        series: (item.sets ?? []).map((s) => ({
          reps: String(s.reps ?? "10"),
          peso: String(s.weight ?? ""),
          rir: s.rir != null ? String(s.rir) : undefined,
          descanso: s.rest != null ? String(s.rest) : undefined,
          tempo: s.tempo,
          notas: s.notes,
        })),
      },
    ];
    // Supersets se aplanan como ejercicios consecutivos
    for (const ss of item.supersetExercises ?? []) {
      elementos.push(...mapeoItemAElementos(ss, mapeoEjercicios));
    }
    return elementos;
  }

  if (item.type === "TASK") {
    const tf = item.taskFields ?? {};
    const pdf = tf.media?.find((m) => m.type === "pdf");
    if (pdf) {
      return [
        {
          id: item.id,
          tipo: "pdf",
          titulo: tf.title ?? "Documento",
          url: pdf.url, // URL externa de TS; queda como link directo
          nombre_archivo: tf.title ?? "documento.pdf",
        },
      ];
    }
    const video = tf.media?.find((m) =>
      m.type.startsWith("video") || m.type === "mp4"
    );
    if (video) {
      return [
        {
          id: item.id,
          tipo: "video_externo",
          titulo: tf.title ?? "Vídeo",
          url: video.url,
          proveedor: "otro",
        },
      ];
    }
    // Sin media: contenido markdown
    return [
      {
        id: item.id,
        tipo: "contenido",
        titulo: tf.title ?? "Nota",
        markdown: tf.description ?? "",
      },
    ];
  }

  return [];
}

// ============================================================================
// MIGRADORES
// ============================================================================

async function migrarEjercicios(coachId: string): Promise<Map<string, string>> {
  seccion("Ejercicios");
  const mapeo = new Map<string, string>(); // trainerstudio_id → local id
  const data = (await tsGet(TS_ENDPOINTS.exercises, { type: "my" })) as
    | TSExercise[]
    | { exercises?: TSExercise[]; data?: TSExercise[] };
  const ejercicios: TSExercise[] = Array.isArray(data)
    ? data
    : (data as { exercises?: TSExercise[] }).exercises ??
      (data as { data?: TSExercise[] }).data ??
      [];

  log("info", `${ejercicios.length} ejercicios encontrados en TS`);

  let n = 0;
  for (const e of ejercicios) {
    n += 1;
    const base = ejercicioATS(coachId)(e);

    // Subir imagen y vídeo si los hay
    const srcImagen = e.image ?? e.imageUrl ?? null;
    const srcVideo = e.videoUrl ?? e.video ?? null;

    let imagen_url: string | null = null;
    let video_url: string | null = null;

    if (srcImagen) {
      imagen_url = await copiarArchivoAStorage({
        origenUrl: srcImagen,
        bucket: "ejercicios-imagenes",
        coachId,
        prefijo: `ej_${e.id}`,
      });
    }
    if (srcVideo) {
      video_url = await copiarArchivoAStorage({
        origenUrl: srcVideo,
        bucket: "ejercicios-videos",
        coachId,
        prefijo: `ej_${e.id}`,
      });
    }

    const fila = { ...base, imagen_url, video_url };

    if (CONFIG.DRY_RUN) {
      log("dim", `  [${n}/${ejercicios.length}] DRY: ${fila.nombre}`);
      mapeo.set(e.id, `[dry-run-${e.id}]`);
      continue;
    }

    const { data: ins, error } = await sb()
      .from("ejercicios")
      .upsert(fila, { onConflict: "coach_id,trainerstudio_id" })
      .select("id, trainerstudio_id")
      .single();
    if (error) {
      log("err", `  Error al upsert ejercicio ${e.id}: ${error.message}`);
      continue;
    }
    mapeo.set(e.id, (ins as { id: string }).id);
    if (n % 20 === 0 || n === ejercicios.length) {
      log("ok", `  ${n}/${ejercicios.length} ejercicios procesados`);
    }
  }

  return mapeo;
}

async function migrarClientas(coachId: string): Promise<Map<string, string>> {
  seccion("Clientas");
  const mapeo = new Map<string, string>();
  const data = (await tsGet(TS_ENDPOINTS.customers)) as
    | TSCustomer[]
    | { customers?: TSCustomer[]; data?: TSCustomer[] };
  const clientas: TSCustomer[] = Array.isArray(data)
    ? data
    : (data as { customers?: TSCustomer[] }).customers ??
      (data as { data?: TSCustomer[] }).data ??
      [];

  log("info", `${clientas.length} clientas encontradas`);

  for (const c of clientas) {
    const fila = clientaATS(coachId)(c);
    if (CONFIG.DRY_RUN) {
      log("dim", `  DRY: ${fila.nombre} <${fila.email}>`);
      mapeo.set(c.id, `[dry-run-${c.id}]`);
      continue;
    }
    const { data: ins, error } = await sb()
      .from("clientas")
      .upsert(fila, { onConflict: "coach_id,trainerstudio_id" })
      .select("id")
      .single();
    if (error) {
      log("err", `  Error al upsert clienta ${c.email}: ${error.message}`);
      continue;
    }
    mapeo.set(c.id, (ins as { id: string }).id);
    log("ok", `  ${fila.nombre} ${fila.apellidos ?? ""}`);
  }

  return mapeo;
}

async function migrarProgramas(
  coachId: string,
  mapeoEjercicios: Map<string, string>
): Promise<Map<string, string>> {
  seccion("Programas");
  const mapeo = new Map<string, string>();
  const data = (await tsGet(TS_ENDPOINTS.programs)) as
    | TSProgram[]
    | { programs?: TSProgram[]; data?: TSProgram[] };
  const programasResumen: TSProgram[] = Array.isArray(data)
    ? data
    : (data as { programs?: TSProgram[] }).programs ??
      (data as { data?: TSProgram[] }).data ??
      [];

  log("info", `${programasResumen.length} programas encontrados`);

  for (const resumen of programasResumen) {
    // Resumen puede no incluir workoutBlocks; cargar el detalle completo
    let detalle: TSProgram;
    try {
      detalle = (await tsGet(TS_ENDPOINTS.program(resumen.id))) as TSProgram;
    } catch (e) {
      log("err", `  No se pudo cargar detalle de ${resumen.name}: ${e}`);
      continue;
    }
    const fila = programaATS(coachId, mapeoEjercicios)(detalle);
    if (CONFIG.DRY_RUN) {
      log(
        "dim",
        `  DRY: ${fila.nombre} (${fila.num_semanas} sem, ${fila.estructura.reduce(
          (a, s) =>
            a +
            s.dias.reduce((b, d) => b + d.bloques.length, 0),
          0
        )} bloques)`
      );
      mapeo.set(detalle.id, `[dry-run-${detalle.id}]`);
      continue;
    }
    const { data: ins, error } = await sb()
      .from("programas")
      .upsert(fila, { onConflict: "coach_id,trainerstudio_id" })
      .select("id")
      .single();
    if (error) {
      log("err", `  Error al upsert programa ${detalle.name}: ${error.message}`);
      continue;
    }
    mapeo.set(detalle.id, (ins as { id: string }).id);
    log("ok", `  ${fila.nombre} (${fila.num_semanas} sem)`);
  }

  return mapeo;
}

async function migrarMetricas(
  coachId: string,
  mapeoClientas: Map<string, string>
) {
  seccion("Métricas");
  let total = 0;
  for (const [tsCustomerId, localId] of mapeoClientas) {
    if (localId.startsWith("[dry-run-")) continue;
    let metricas: Array<{
      id?: string;
      type?: string;
      value?: number;
      unit?: string;
      date?: string;
    }> = [];
    try {
      const data = (await tsGet(
        TS_ENDPOINTS.customerMetrics(tsCustomerId)
      )) as
        | typeof metricas
        | { metrics?: typeof metricas; data?: typeof metricas };
      metricas = Array.isArray(data)
        ? data
        : (data as { metrics?: typeof metricas }).metrics ??
          (data as { data?: typeof metricas }).data ??
          [];
    } catch (e) {
      log("warn", `  No se pudieron leer métricas de ${tsCustomerId}: ${e}`);
      continue;
    }
    for (const m of metricas) {
      if (!m.type || m.value == null || !m.date) continue;
      const fila = {
        coach_id: coachId,
        clienta_id: localId,
        tipo: m.type,
        valor: m.value,
        unidad: m.unit ?? "",
        fecha: m.date.slice(0, 10),
      };
      if (CONFIG.DRY_RUN) {
        total += 1;
        continue;
      }
      const { error } = await sb().from("metricas").insert(fila);
      if (error && !error.message.includes("duplicate")) {
        log("err", `  Métrica ${m.id}: ${error.message}`);
        continue;
      }
      total += 1;
    }
  }
  log("ok", `${total} métricas migradas`);
}

async function migrarFotos(
  coachId: string,
  mapeoClientas: Map<string, string>
) {
  seccion("Fotos de progreso");
  let total = 0;
  for (const [tsCustomerId, localId] of mapeoClientas) {
    if (localId.startsWith("[dry-run-")) continue;
    let fotos: Array<{
      id?: string;
      url?: string;
      type?: string;
      date?: string;
      notes?: string;
    }> = [];
    try {
      const data = (await tsGet(
        TS_ENDPOINTS.customerPhotos(tsCustomerId)
      )) as
        | typeof fotos
        | { photos?: typeof fotos; data?: typeof fotos };
      fotos = Array.isArray(data)
        ? data
        : (data as { photos?: typeof fotos }).photos ??
          (data as { data?: typeof fotos }).data ??
          [];
    } catch (e) {
      log("warn", `  No se pudieron leer fotos de ${tsCustomerId}: ${e}`);
      continue;
    }
    for (const f of fotos) {
      if (!f.url || !f.date) continue;
      const subida = await copiarArchivoAStorage({
        origenUrl: f.url,
        bucket: "fotos-progreso",
        coachId,
        prefijo: `c_${localId}`,
      });
      if (!subida) continue;
      const fila = {
        coach_id: coachId,
        clienta_id: localId,
        url: subida,
        tipo: ["frontal", "lateral", "trasera"].includes(f.type ?? "")
          ? f.type
          : "otra",
        fecha: f.date.slice(0, 10),
        notas: f.notes ?? null,
      };
      if (CONFIG.DRY_RUN) {
        total += 1;
        continue;
      }
      const { error } = await sb().from("fotos_progreso").insert(fila);
      if (error && !error.message.includes("duplicate")) {
        log("err", `  Foto ${f.id}: ${error.message}`);
        continue;
      }
      total += 1;
    }
  }
  log("ok", `${total} fotos migradas`);
}

async function migrarNotas(
  coachId: string,
  mapeoClientas: Map<string, string>
) {
  seccion("Notas internas");
  let total = 0;
  for (const [tsCustomerId, localId] of mapeoClientas) {
    if (localId.startsWith("[dry-run-")) continue;
    let notas: Array<{ id?: string; content?: string; createdAt?: string }> = [];
    try {
      const data = (await tsGet(TS_ENDPOINTS.customerNotes(tsCustomerId))) as
        | typeof notas
        | { notes?: typeof notas; data?: typeof notas };
      notas = Array.isArray(data)
        ? data
        : (data as { notes?: typeof notas }).notes ??
          (data as { data?: typeof notas }).data ??
          [];
    } catch (e) {
      log("warn", `  No se pudieron leer notas de ${tsCustomerId}: ${e}`);
      continue;
    }
    for (const n of notas) {
      if (!n.content) continue;
      const fila = {
        coach_id: coachId,
        clienta_id: localId,
        contenido: n.content,
        creada_en: n.createdAt ?? new Date().toISOString(),
      };
      if (CONFIG.DRY_RUN) {
        total += 1;
        continue;
      }
      const { error } = await sb().from("notas").insert(fila);
      if (error) {
        log("err", `  Nota ${n.id}: ${error.message}`);
        continue;
      }
      total += 1;
    }
  }
  log("ok", `${total} notas migradas`);
}

async function migrarSesiones(
  coachId: string,
  mapeoClientas: Map<string, string>
) {
  type Compliance = {
    dailyCompliance?: Array<{
      date: string;
      isWorkoutDay?: boolean;
      isRestDay?: boolean;
      isCompleted?: boolean;
      totalItems?: number;
      completedItems?: number;
    }>;
  };

  seccion("Sesiones (histórico de adherencia)");
  let total = 0;
  for (const [tsCustomerId, localId] of mapeoClientas) {
    if (localId.startsWith("[dry-run-")) continue;
    let compliance: Compliance | null = null;
    try {
      compliance = (await tsGet(
        TS_ENDPOINTS.customerCompliance(tsCustomerId)
      )) as Compliance;
    } catch (e) {
      log("warn", `  Sin compliance para ${tsCustomerId}: ${e}`);
      continue;
    }
    for (const d of compliance?.dailyCompliance ?? []) {
      if (!d.isWorkoutDay) continue;
      const totalItems = d.totalItems ?? 0;
      const completedItems = d.completedItems ?? 0;
      const porcentaje =
        totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
      const fila = {
        coach_id: coachId,
        clienta_id: localId,
        fecha: d.date,
        completada: d.isCompleted ?? false,
        porcentaje_completado: porcentaje,
        registros: {},
      };
      if (CONFIG.DRY_RUN) {
        total += 1;
        continue;
      }
      const { error } = await sb()
        .from("sesiones")
        .upsert(fila, { onConflict: "clienta_id,fecha" });
      if (error) {
        log("err", `  Sesión ${d.date}: ${error.message}`);
        continue;
      }
      total += 1;
    }
  }
  log("ok", `${total} sesiones migradas`);
}

// ============================================================================
// PROBE — primera verificación rápida
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

  // 1) Verificar Supabase: ¿hay coach?
  try {
    const coachId = await obtenerCoachId();
    log("ok", `Coach destino encontrado: ${coachId.slice(0, 8)}…`);
  } catch (e) {
    log("err", e instanceof Error ? e.message : String(e));
    process.exit(1);
  }

  // 2) Verificar TS: list exercises
  try {
    log("info", `GET ${CONFIG.TS_BASE}${TS_ENDPOINTS.exercises}?type=my`);
    const data = (await tsGet(TS_ENDPOINTS.exercises, { type: "my" })) as
      | unknown[]
      | { exercises?: unknown[]; data?: unknown[] };
    const lista = Array.isArray(data)
      ? data
      : (data as { exercises?: unknown[] }).exercises ??
        (data as { data?: unknown[] }).data ??
        [];
    log("ok", `${lista.length} ejercicios respondidos por TS`);
    if (lista[0]) {
      console.log(`${C.dim}Ejemplo:${C.reset}`, JSON.stringify(lista[0], null, 2));
    }
  } catch (e) {
    log("err", e instanceof Error ? e.message : String(e));
    log(
      "warn",
      "Si el endpoint no es /exercises, edítalo en TS_ENDPOINTS al inicio de migrate.ts"
    );
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
  if (CONFIG.DRY_RUN) log("warn", "MODO DRY-RUN: no se escribirá nada en BD");
  if (CONFIG.SKIP_STORAGE)
    log("warn", "--skip-storage: imágenes/vídeos no se copian, se guardan URLs originales de TS");
  if (CONFIG.ONLY) log("info", `Solo entidad: ${CONFIG.ONLY}`);

  if (CONFIG.PROBE) {
    await probe();
    return;
  }

  if (
    !CONFIG.TS_API_KEY ||
    !CONFIG.SUPABASE_URL ||
    !CONFIG.SUPABASE_SERVICE_ROLE_KEY
  ) {
    log(
      "err",
      "Faltan variables de entorno. Ejecuta `npm run probe` para diagnóstico."
    );
    process.exit(1);
  }

  const coachId = await obtenerCoachId();

  const debeCorrer = (e: Entidad) => !CONFIG.ONLY || CONFIG.ONLY === e;

  let mapeoEjercicios = new Map<string, string>();
  let mapeoClientas = new Map<string, string>();

  if (debeCorrer("ejercicios")) {
    mapeoEjercicios = await migrarEjercicios(coachId);
  } else {
    // Cargar mapeo existente de la BD para que la migración de programas funcione
    const { data } = await sb()
      .from("ejercicios")
      .select("id, trainerstudio_id")
      .not("trainerstudio_id", "is", null);
    for (const ej of (data ?? []) as Array<{
      id: string;
      trainerstudio_id: string;
    }>) {
      mapeoEjercicios.set(ej.trainerstudio_id, ej.id);
    }
  }

  if (debeCorrer("clientas")) {
    mapeoClientas = await migrarClientas(coachId);
  } else {
    const { data } = await sb()
      .from("clientas")
      .select("id, trainerstudio_id")
      .not("trainerstudio_id", "is", null);
    for (const c of (data ?? []) as Array<{
      id: string;
      trainerstudio_id: string;
    }>) {
      mapeoClientas.set(c.trainerstudio_id, c.id);
    }
  }

  if (debeCorrer("programas")) {
    await migrarProgramas(coachId, mapeoEjercicios);
  }
  if (debeCorrer("metricas")) {
    await migrarMetricas(coachId, mapeoClientas);
  }
  if (debeCorrer("sesiones")) {
    await migrarSesiones(coachId, mapeoClientas);
  }
  if (debeCorrer("fotos")) {
    await migrarFotos(coachId, mapeoClientas);
  }
  if (debeCorrer("notas")) {
    await migrarNotas(coachId, mapeoClientas);
  }

  console.log("");
  log("ok", "Migración completada.");
  if (CONFIG.DRY_RUN) {
    console.log("");
    log("warn", "Ha sido un dry-run. Ejecuta sin --dry-run para escribir de verdad.");
  }
}

main().catch((e) => {
  console.error(`${C.red}Error fatal:${C.reset}`, e);
  process.exit(1);
});
