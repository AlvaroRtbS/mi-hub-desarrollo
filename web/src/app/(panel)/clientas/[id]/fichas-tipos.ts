// Tipos y constantes de las fichas de clienta.
//
// Viven en un archivo aparte (SIN "use server") a propósito: los archivos de
// server actions solo pueden EXPORTAR funciones async. Exportar TIPOS_FICHA
// (un objeto/array) desde acciones-fichas.ts rompía el render de la ficha de
// clienta con: 'A "use server" file can only export async functions'.

export const TIPOS_FICHA = [
  { id: "anamnesis", label: "Anamnesis", emoji: "🧬" },
  { id: "lesiones", label: "Lesiones / limitaciones", emoji: "🩹" },
  {
    id: "preferencias_alimentarias",
    label: "Preferencias alimentarias",
    emoji: "🥗",
  },
  { id: "historial_deportivo", label: "Historial deportivo", emoji: "🏃" },
  { id: "disponibilidad", label: "Disponibilidad", emoji: "📅" },
] as const;

export type TipoFicha = (typeof TIPOS_FICHA)[number]["id"];
