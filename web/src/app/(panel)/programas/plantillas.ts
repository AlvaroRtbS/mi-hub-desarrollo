// ============================================================================
// Plantillas de programa predefinidas
// ============================================================================
// Esqueletos listos para que la entrenadora arranque un programa rápido.
// Cuando se elige una, se duplica como programa nuevo y se le asigna
// `origen='plantilla'` para poder filtrarlos después.
// Los bloques traen ejercicios "tipo" sin enlazar a la biblioteca real —
// la entrenadora los rellena después con sus propios ejercicios.
// ============================================================================

import type { EstructuraPrograma, Bloque, Dia } from "@/lib/supabase/tipos";
import { NOMBRES_DIAS } from "@/lib/supabase/tipos";

type PlantillaProgramaDef = {
  id: string;
  nombre: string;
  resumen: string;
  emoji: string;
  diasPorSemana: number;
  numSemanas: number;
  etiquetas: string[];
  /** Función que recibe el índice de día (0..6) y devuelve los bloques de ese día */
  bloquesPorDia: (diaIdx: number) => Bloque[] | "descanso";
};

function bloqueVacio(titulo: string, indicaciones?: string): Bloque {
  return {
    id: crypto.randomUUID(),
    titulo,
    indicaciones,
    elementos: [],
  };
}

export const PLANTILLAS: PlantillaProgramaDef[] = [
  {
    id: "full-body-3d",
    nombre: "Full body 3 días",
    resumen:
      "Lun / Mié / Vie cuerpo completo, ideal para empezar o mantenerse en forma.",
    emoji: "💪",
    diasPorSemana: 3,
    numSemanas: 4,
    etiquetas: ["principiante", "full body"],
    bloquesPorDia: (i) => {
      if (i === 0 || i === 2 || i === 4) {
        return [
          bloqueVacio("Calentamiento", "5-10 min cardio + movilidad articular"),
          bloqueVacio(
            "Principal",
            "Tren inferior + empuje + tracción. 3 series por ejercicio."
          ),
          bloqueVacio("Core / accesorios", "2 ejercicios, 3 series"),
        ];
      }
      return "descanso";
    },
  },

  {
    id: "ppl-4d",
    nombre: "PPL 4 días (Push / Pull / Legs)",
    resumen:
      "Estructura clásica de hipertrofia: empuje, tracción y pierna repartidos.",
    emoji: "🏋️‍♀️",
    diasPorSemana: 4,
    numSemanas: 6,
    etiquetas: ["intermedio", "hipertrofia"],
    bloquesPorDia: (i) => {
      switch (i) {
        case 0:
          return [
            bloqueVacio("Calentamiento"),
            bloqueVacio("Push (pecho, hombro, tríceps)", "4 ejercicios, 3-4 series"),
          ];
        case 1:
          return [
            bloqueVacio("Calentamiento"),
            bloqueVacio("Pull (espalda, bíceps)", "4 ejercicios, 3-4 series"),
          ];
        case 3:
          return [
            bloqueVacio("Calentamiento", "Movilidad cadera y tobillo"),
            bloqueVacio("Pierna énfasis cuádriceps", "Sentadilla + accesorios"),
          ];
        case 4:
          return [
            bloqueVacio("Calentamiento"),
            bloqueVacio("Pierna énfasis glúteo / femoral", "Peso muerto + accesorios"),
          ];
        default:
          return "descanso";
      }
    },
  },

  {
    id: "gluteos-4d",
    nombre: "Glúteos 4 días",
    resumen:
      "Énfasis glúteo medio y mayor con trabajo accesorio de pierna y core.",
    emoji: "🍑",
    diasPorSemana: 4,
    numSemanas: 8,
    etiquetas: ["glúteo", "hipertrofia"],
    bloquesPorDia: (i) => {
      switch (i) {
        case 0:
          return [
            bloqueVacio("Activación glúteo", "Bandas, 3 ejercicios x 15"),
            bloqueVacio("Hip thrust progresivo", "4 series 8-12 reps"),
            bloqueVacio("Sentadilla búlgara + accesorios"),
          ];
        case 1:
          return [
            bloqueVacio("Tren superior + core ligero"),
            bloqueVacio("Caminata + cardio", "30-40 min Z2"),
          ];
        case 3:
          return [
            bloqueVacio("Activación posterior"),
            bloqueVacio("Peso muerto rumano", "4x8"),
            bloqueVacio("Patada glúteo + abducciones"),
          ];
        case 5:
          return [
            bloqueVacio("Glúteo medio + isométricos", "Bandas y poleas"),
            bloqueVacio("Core completo"),
          ];
        default:
          return "descanso";
      }
    },
  },

  {
    id: "tonificacion-3d",
    nombre: "Tonificación 3 días",
    resumen:
      "Circuitos full body con peso moderado y poco descanso, ideal para perder grasa.",
    emoji: "🔥",
    diasPorSemana: 3,
    numSemanas: 6,
    etiquetas: ["pérdida de grasa", "circuito"],
    bloquesPorDia: (i) => {
      if (i === 0 || i === 2 || i === 4) {
        return [
          bloqueVacio("Calentamiento dinámico", "10 min"),
          bloqueVacio(
            "Circuito 1",
            "4 ejercicios x 12 reps · 3 vueltas · 30s descanso"
          ),
          bloqueVacio(
            "Circuito 2",
            "4 ejercicios x 15 reps · 3 vueltas · 30s descanso"
          ),
          bloqueVacio("Cardio finisher", "10 min HIIT o caminata fuerte"),
        ];
      }
      return "descanso";
    },
  },

  {
    id: "embarazo-2d",
    nombre: "Embarazo · 2 días",
    resumen: "Trabajo de movilidad, suelo pélvico y fuerza ligera segura.",
    emoji: "🤰",
    diasPorSemana: 2,
    numSemanas: 8,
    etiquetas: ["embarazo", "seguro"],
    bloquesPorDia: (i) => {
      if (i === 1 || i === 4) {
        return [
          bloqueVacio("Respiración + suelo pélvico", "5 min"),
          bloqueVacio("Movilidad cadera + columna"),
          bloqueVacio("Fuerza ligera tren completo", "Bandas, 2 series x 12"),
          bloqueVacio("Caminata", "20-30 min ritmo cómodo"),
        ];
      }
      return "descanso";
    },
  },

  {
    id: "rehab-hombro-3d",
    nombre: "Rehab hombro · 3 días",
    resumen:
      "Vuelta progresiva tras lesión: movilidad → activación → fuerza controlada.",
    emoji: "🩹",
    diasPorSemana: 3,
    numSemanas: 4,
    etiquetas: ["rehabilitación", "hombro"],
    bloquesPorDia: (i) => {
      if (i === 0 || i === 2 || i === 4) {
        return [
          bloqueVacio("Movilidad escapular", "3 ejercicios x 10"),
          bloqueVacio("Activación manguito rotador", "Bandas, 3 series x 15"),
          bloqueVacio("Fuerza controlada", "Press y remo bajo carga progresiva"),
        ];
      }
      return "descanso";
    },
  },
];

export function obtenerPlantilla(id: string): PlantillaProgramaDef | undefined {
  return PLANTILLAS.find((p) => p.id === id);
}

export function construirEstructuraDesdePlantilla(
  plantilla: PlantillaProgramaDef
): EstructuraPrograma {
  return Array.from({ length: plantilla.numSemanas }, (_, semIdx) => ({
    semana: semIdx + 1,
    dias: NOMBRES_DIAS.map<Dia>((titulo, diaIdx) => {
      const bloques = plantilla.bloquesPorDia(diaIdx);
      if (bloques === "descanso") {
        return { dia: diaIdx + 1, titulo, descanso: true, bloques: [] };
      }
      // Hay que regenerar los IDs de los bloques para que sean únicos por semana
      const conIds = bloques.map((b) => ({
        ...b,
        id: crypto.randomUUID(),
        elementos: [...b.elementos],
      }));
      return { dia: diaIdx + 1, titulo, descanso: false, bloques: conIds };
    }),
  }));
}
