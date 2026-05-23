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
};

export type ElementoRecordatorio = {
  id: string;
  tipo: "recordatorio";
  hora: string;
  mensaje: string;
};

export type Elemento =
  | ElementoEjercicio
  | ElementoContenido
  | ElementoMetricaPrompt
  | ElementoFotoPrompt
  | ElementoPasosPrompt
  | ElementoRecordatorio;

export type Bloque = {
  id: string;
  titulo: string;
  indicaciones?: string;
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
