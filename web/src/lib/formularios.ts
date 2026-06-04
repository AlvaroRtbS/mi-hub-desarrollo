// Tipos compartidos del CONSTRUCTOR DE FORMULARIOS GENÉRICO.
// Las plantillas (titulo, descripcion, preguntas) viven en la tabla
// `formularios` y las respuestas en `formulario_asignaciones`.

export type TipoPregunta =
  | "texto"
  | "parrafo"
  | "numero"
  | "fecha"
  | "escala"
  | "eleccion"
  | "multiple";

export type PreguntaForm = {
  id: string;
  label: string;
  tipo: TipoPregunta;
  placeholder?: string;
  sufijo?: string;
  requerida?: boolean;
  /** Para tipo "eleccion" y "multiple". */
  opciones?: string[];
  /** Para tipo "escala" (1-5). */
  etiquetaMin?: string;
  etiquetaMax?: string;
};

export type Formulario = {
  id: string;
  titulo: string;
  descripcion: string | null;
  preguntas: PreguntaForm[];
};

export const TIPOS_PREGUNTA: { tipo: TipoPregunta; label: string }[] = [
  { tipo: "texto", label: "Texto corto" },
  { tipo: "parrafo", label: "Párrafo" },
  { tipo: "numero", label: "Número" },
  { tipo: "fecha", label: "Fecha" },
  { tipo: "escala", label: "Escala 1-5" },
  { tipo: "eleccion", label: "Elección única" },
  { tipo: "multiple", label: "Opción múltiple" },
];

export function etiquetaTipo(tipo: TipoPregunta): string {
  return TIPOS_PREGUNTA.find((t) => t.tipo === tipo)?.label ?? tipo;
}

/** Genera un id corto y estable para una pregunta nueva. */
export function nuevoIdPregunta(existentes: PreguntaForm[]): string {
  let n = existentes.length + 1;
  const ids = new Set(existentes.map((p) => p.id));
  while (ids.has(`p${n}`)) n++;
  return `p${n}`;
}

/** ¿El tipo usa la lista de opciones? */
export function usaOpciones(tipo: TipoPregunta): boolean {
  return tipo === "eleccion" || tipo === "multiple";
}

/** ¿El tipo es de escala (botones 1-5)? */
export function usaEscala(tipo: TipoPregunta): boolean {
  return tipo === "escala";
}

/**
 * Comprueba si una respuesta está vacía (para validar las preguntas
 * `requerida`). `multiple` guarda array; el resto guarda string.
 */
export function respuestaVacia(valor: unknown): boolean {
  if (Array.isArray(valor)) return valor.length === 0;
  return valor == null || String(valor).trim() === "";
}
