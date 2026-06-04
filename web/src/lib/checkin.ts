// Definición del check-in semanal (cuestionario breve y recurrente que rellena
// la clienta cada semana). Las preguntas son fijas (MVP); las respuestas se
// guardan en la tabla `checkins`, una fila por (clienta, semana = lunes).

export type PreguntaCheckin =
  | {
      id: string;
      tipo: "parrafo" | "numero";
      label: string;
      placeholder?: string;
      sufijo?: string;
    }
  | {
      id: string;
      tipo: "escala";
      label: string;
      etiquetaMin: string;
      etiquetaMax: string;
    };

export const CHECKIN_SEMANAL: {
  titulo: string;
  intro: string;
  preguntas: PreguntaCheckin[];
} = {
  titulo: "Check-in de la semana",
  intro:
    "Un minuto para contarme cómo te ha ido. Cuanto más sincera, mejor ajusto tu plan.",
  preguntas: [
    {
      id: "resumen",
      tipo: "parrafo",
      label: "¿Cómo ha ido la semana en general?",
      placeholder: "Lo bueno, lo difícil, cómo te has sentido…",
    },
    {
      id: "adherencia_entreno",
      tipo: "escala",
      label: "¿Cuánto cumpliste los entrenos?",
      etiquetaMin: "Nada",
      etiquetaMax: "Todos",
    },
    {
      id: "adherencia_dieta",
      tipo: "escala",
      label: "¿Cuánto cumpliste la alimentación?",
      etiquetaMin: "Nada",
      etiquetaMax: "Todo",
    },
    {
      id: "energia",
      tipo: "escala",
      label: "Nivel de energía",
      etiquetaMin: "Muy baja",
      etiquetaMax: "Muy alta",
    },
    {
      id: "sueno",
      tipo: "escala",
      label: "Calidad del sueño",
      etiquetaMin: "Mala",
      etiquetaMax: "Buena",
    },
    {
      id: "peso",
      tipo: "numero",
      label: "Peso de esta semana (opcional)",
      sufijo: "kg",
    },
    {
      id: "comentario",
      tipo: "parrafo",
      label: "¿Algo que quieras que sepa o alguna duda?",
      placeholder: "Opcional",
    },
  ],
};

/** Lunes (YYYY-MM-DD) de la semana actual en zona horaria Europe/Madrid. */
export function lunesDeEstaSemana(): string {
  const hoy = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
  }).format(new Date());
  const d = new Date(hoy + "T00:00:00Z");
  const dow = (d.getUTCDay() + 6) % 7; // domingo=6, lunes=0
  d.setUTCDate(d.getUTCDate() - dow);
  return d.toISOString().slice(0, 10);
}
