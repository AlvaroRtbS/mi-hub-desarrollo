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
