// Tipos espejo del esquema de base de datos.
// Se mantienen a mano por simplicidad. Si en el futuro queremos generación automática,
// usaremos `supabase gen types typescript`.

export type Coach = {
  id: string;
  user_id: string;
  nombre: string;
  email: string;
  telefono: string | null;
  foto_url: string | null;
  bio: string | null;
  marca_nombre: string | null;
  marca_color_primario: string | null;
  marca_logo_url: string | null;
  plan: "free" | "starter" | "pro" | "unlimited";
  creada_en: string;
};

export type EstadoClienta = "invitada" | "activa" | "archivada";

// Funnel comercial (CRM) — independiente de `estado` (operativo del portal).
export type EtapaClienta =
  | "lead"
  | "activa"
  | "pausada"
  | "baja"
  | "recuperable";

export type Clienta = {
  id: string;
  coach_id: string;
  user_id: string | null;
  nombre: string;
  apellidos: string | null;
  email: string;
  telefono: string | null;
  fecha_nacimiento: string | null;
  foto_url: string | null;
  estado: EstadoClienta;
  trainerstudio_id: string | null;
  notas_publicas: string | null;
  invitada_en: string | null;
  creada_en: string;
  // --- CRM Fase 1 (capa comercial) ---
  etapa: EtapaClienta | null;
  lead_source: string | null;
  whatsapp_phone: string | null;
  es_avatar_objetivo: boolean | null;
  objetivo_principal: string | null;
  ciudad: string | null;
  condiciones_medicas: string | null;
  lesiones_limitaciones: string | null;
  material: string | null;
  notas_contexto: string | null;
  stripe_customer_id: string | null;
};

// --- CRM Fase 3 (inscripciones + pagos) ---
export type TipoPago = "unico" | "fraccionado";
export type EstadoInscripcion = "activa" | "finalizada" | "cancelada";
export type EstadoPago = "pendiente" | "pagado" | "fallido" | "reembolsado";
export type OrigenPago =
  | "stripe"
  | "sepa"
  | "bizum"
  | "transferencia"
  | "efectivo"
  | "otro";

export type Inscripcion = {
  id: string;
  coach_id: string;
  clienta_id: string;
  concepto: string;
  fecha_inicio: string;
  fecha_fin: string | null;
  importe_total: number | null;
  tipo_pago: TipoPago;
  cuotas_total: number;
  renovacion_fecha: string | null;
  estado: EstadoInscripcion;
  stripe_subscription_id: string | null;
  notas: string | null;
  creada_en: string;
  actualizada_en: string;
};

export type Pago = {
  id: string;
  coach_id: string;
  clienta_id: string;
  inscripcion_id: string | null;
  importe: number;
  moneda: string;
  concepto: string | null;
  fecha_vencimiento: string | null;
  pagado_en: string | null;
  estado: EstadoPago;
  origen: OrigenPago | null;
  numero_cuota: number | null;
  stripe_payment_intent_id: string | null;
  notas: string | null;
  creada_en: string;
  actualizada_en: string;
};

export type Ejercicio = {
  id: string;
  coach_id: string;
  nombre: string;
  descripcion: string | null;
  instrucciones: string | null;
  video_url: string | null;
  imagen_url: string | null;
  grupos_musculares: string[];
  material: string[];
  origen: string;
  trainerstudio_id: string | null;
  creado_en: string;
  actualizado_en: string;
};

export const GRUPOS_MUSCULARES = [
  "Pecho",
  "Espalda",
  "Hombros",
  "Brazos",
  "Pierna",
  "Glúteo",
  "Core",
  "Cardio",
  "Cuerpo completo",
] as const;

export const MATERIAL = [
  "Peso corporal",
  "Mancuernas",
  "Barra",
  "Kettlebell",
  "Banda elástica",
  "Polea",
  "Máquina",
  "TRX",
  "Esterilla",
  "Otro",
] as const;

// ============================================================================
// PROGRAMAS — estructura JSONB
// ============================================================================
// Forma jerárquica: programa → semanas → días → bloques → elementos.

export type SerieEjercicio = {
  reps: string;
  peso: string;
  rir?: string;
  descanso?: string;
  tempo?: string;
  notas?: string;
};

export type ElementoEjercicio = {
  id: string;
  tipo: "ejercicio";
  ejercicio_id: string;
  /** Snapshot del nombre por si el ejercicio se borra después. */
  ejercicio_nombre?: string;
  series: SerieEjercicio[];
  notas?: string;
};

export type ElementoContenido = {
  id: string;
  tipo: "contenido";
  titulo: string;
  markdown: string;
  /** Imágenes/capturas adjuntas (paths en bucket programa-adjuntos). */
  imagenes?: string[];
};

export type ElementoMetricaPrompt = {
  id: string;
  tipo: "metrica_prompt";
  metrica_tipo: string;
};

export type ElementoFotoPrompt = {
  id: string;
  tipo: "foto_progreso_prompt";
};

export type ElementoPasosPrompt = {
  id: string;
  tipo: "pasos_prompt";
  /** Período al que se refiere el conteo. Default "dia" para compat. */
  periodo?: "dia" | "semana" | "media_semanal";
  /** Instrucciones libres del coach para la clienta. */
  instrucciones?: string;
  /** Si es true, la clienta puede adjuntar capturas/fotos al rellenar. */
  permitir_capturas?: boolean;
};

export type ElementoRecordatorio = {
  id: string;
  tipo: "recordatorio";
  hora: string;
  mensaje: string;
};

/** PDF adjunto al bloque (path dentro del bucket programa-adjuntos). */
export type ElementoPDF = {
  id: string;
  tipo: "pdf";
  titulo: string;
  url: string;
  nombre_archivo?: string;
};

/** Vídeo subido al storage propio (path dentro del bucket programa-adjuntos). */
export type ElementoVideo = {
  id: string;
  tipo: "video";
  titulo: string;
  url: string;
  nombre_archivo?: string;
};

/** Vídeo externo (YouTube / Vimeo / etc.) por URL. */
export type ElementoVideoExterno = {
  id: string;
  tipo: "video_externo";
  titulo: string;
  url: string;
  proveedor: "youtube" | "vimeo" | "otro";
};

/** Enlace externo arbitrario (artículo, web, recurso). */
export type ElementoEnlace = {
  id: string;
  tipo: "enlace";
  titulo: string;
  url: string;
  descripcion?: string;
};

export type Elemento =
  | ElementoEjercicio
  | ElementoContenido
  | ElementoMetricaPrompt
  | ElementoFotoPrompt
  | ElementoPasosPrompt
  | ElementoRecordatorio
  | ElementoPDF
  | ElementoVideo
  | ElementoVideoExterno
  | ElementoEnlace;

/**
 * Detecta el proveedor de un vídeo externo a partir de su URL.
 * Devuelve `null` si no se reconoce.
 */
export function detectarProveedorVideo(
  url: string
): "youtube" | "vimeo" | "otro" {
  const u = url.toLowerCase();
  if (u.includes("youtube.com") || u.includes("youtu.be")) return "youtube";
  if (u.includes("vimeo.com")) return "vimeo";
  return "otro";
}

/**
 * Devuelve la URL embebida (iframe-ready) de un vídeo externo.
 * Si la URL ya es embed o no se reconoce, se devuelve tal cual.
 */
export function urlEmbedVideo(url: string): string {
  try {
    const u = new URL(url);
    // YouTube: https://www.youtube.com/watch?v=ID  ó  https://youtu.be/ID
    if (u.hostname.includes("youtube.com")) {
      const id = u.searchParams.get("v");
      if (id) return `https://www.youtube.com/embed/${id}`;
    }
    if (u.hostname === "youtu.be") {
      const id = u.pathname.slice(1);
      if (id) return `https://www.youtube.com/embed/${id}`;
    }
    // Vimeo: https://vimeo.com/ID
    if (u.hostname.includes("vimeo.com")) {
      const id = u.pathname.split("/").filter(Boolean)[0];
      if (id && /^\d+$/.test(id)) return `https://player.vimeo.com/video/${id}`;
    }
  } catch {
    // url inválida, devolver original
  }
  return url;
}

export type Bloque = {
  id: string;
  titulo: string;
  indicaciones?: string;
  /** Si es true, el bloque es un circuito: sus ejercicios se hacen en
   *  secuencia y se repiten `rondas` veces. */
  circuito?: boolean;
  /** Nº de rondas del circuito (solo si circuito = true). */
  rondas?: number;
  elementos: Elemento[];
};

export type Dia = {
  dia: number;
  titulo: string;
  /** Marca "día de descanso" (sin bloques esperados). */
  descanso?: boolean;
  bloques: Bloque[];
};

export type Semana = {
  semana: number;
  titulo?: string;
  dias: Dia[];
};

export type EstructuraPrograma = Semana[];

export type Programa = {
  id: string;
  coach_id: string;
  nombre: string;
  descripcion: string | null;
  num_semanas: number;
  estructura: EstructuraPrograma;
  imagen_portada_url: string | null;
  trainerstudio_id: string | null;
  creado_en: string;
  actualizado_en: string;
};

export const NOMBRES_DIAS = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
] as const;

export function crearEstructuraVacia(numSemanas: number): EstructuraPrograma {
  return Array.from({ length: numSemanas }, (_, i) => ({
    semana: i + 1,
    dias: NOMBRES_DIAS.map((nombre, j) => ({
      dia: j + 1,
      titulo: nombre,
      descanso: j >= 5,
      bloques: [],
    })),
  }));
}
