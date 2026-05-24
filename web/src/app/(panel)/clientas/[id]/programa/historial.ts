import type { SerieEjercicio } from "@/lib/supabase/tipos";

/**
 * Resumen del historial de una clienta para un ejercicio concreto.
 * Mira las últimas N veces que lo hizo y deduce métricas para sugerir
 * progresión.
 */
export type HistorialEjercicio = {
  vecesHechas: number;
  ultimaFecha: string | null;
  ultimaSerie: SerieEjercicio | null;
  /** Media de reps registradas en la última sesión */
  ultimasMediaReps: number | null;
  /** Peso máximo registrado nunca */
  pesoMaxKg: number | null;
  /** ¿Completó al 100% las series planificadas la última vez? */
  ultimaCompletada: boolean;
  /** RIR (esfuerzo en reserva) declarado por la clienta en últimas series */
  ultimoRir: number | null;
};

/**
 * Sugerencia de progresión generada por heurística simple:
 *   - Si completó al 100% con RIR bajo (≤1) → progresar.
 *   - Si tiene peso (gym): subir peso pequeño (+2.5 kg o +5%).
 *   - Si NO tiene peso (entreno en casa, peso corporal, bandas):
 *       sugerir +2 reps o "variante más difícil".
 *   - Si falló (no completó) → mantener / bajar volumen.
 *   - Sin historial → "primera vez".
 */
export type Sugerencia = {
  tipo:
    | "progresar_peso"
    | "progresar_reps"
    | "variante_dificil"
    | "consolidar"
    | "regresar"
    | "primera_vez";
  texto: string;
  /** Cambios a aplicar a series futuras si el coach acepta. */
  parche?: Partial<SerieEjercicio>;
};

function parsearNumero(s: string | undefined | null): number | null {
  if (!s) return null;
  // "8-12" → 10 (media), "12" → 12, "12 reps" → 12, "40kg" → 40
  const limpio = s.replace(/[^\d.,-]/g, "");
  if (limpio.includes("-")) {
    const [a, b] = limpio.split("-").map((p) => parseFloat(p.replace(",", ".")));
    if (Number.isFinite(a) && Number.isFinite(b)) return (a + b) / 2;
  }
  const n = parseFloat(limpio.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

/**
 * Genera la sugerencia a partir de:
 *   - historial: lo que ya hizo
 *   - serieActual: lo planificado actualmente (peso, reps target)
 *   - sinMaterial: heurística → si todos los ejercicios usan peso corporal/bandas,
 *     no sugerir subir peso sino reps o variante.
 */
export function sugerirProgresion(
  historial: HistorialEjercicio,
  serieActual: SerieEjercicio,
  sinPesoLibre: boolean
): Sugerencia {
  if (historial.vecesHechas === 0) {
    return { tipo: "primera_vez", texto: "Primera vez — observa cómo lo hace" };
  }

  if (!historial.ultimaCompletada) {
    return {
      tipo: "regresar",
      texto: "No completó la última vez — consolida o baja volumen",
    };
  }

  const rir = historial.ultimoRir;
  const fueFacil = rir != null && rir <= 1;
  const fueMedio = rir != null && rir >= 2 && rir <= 3;

  if (!fueFacil && !fueMedio && rir == null) {
    // Sin RIR registrado: asumir que completó pero no sabemos esfuerzo
    return {
      tipo: "consolidar",
      texto: "Completada sin RIR registrado — mantén la carga otra semana",
    };
  }

  if (fueMedio) {
    return {
      tipo: "consolidar",
      texto: `Último RIR ${rir} (medio) — buen progreso, mantén otra sesión`,
    };
  }

  // RIR bajo → progresar
  const pesoActual = parsearNumero(serieActual.peso);
  const repsActual = parsearNumero(serieActual.reps);

  if (sinPesoLibre || !pesoActual || pesoActual === 0) {
    // Entreno en casa o sin material → progresar por reps/variante
    if (repsActual && repsActual >= 15) {
      return {
        tipo: "variante_dificil",
        texto:
          "Reps altas + RIR bajo: prueba una variante más difícil (unilateral, tempo lento, isométrico)",
      };
    }
    const nuevasReps = repsActual ? Math.round(repsActual + 2) : null;
    return {
      tipo: "progresar_reps",
      texto: nuevasReps
        ? `Última vez RIR ${rir}: sube a ~${nuevasReps} reps esta semana`
        : `Última vez RIR ${rir}: añade 2 reps esta semana`,
      parche: nuevasReps ? { reps: String(nuevasReps) } : undefined,
    };
  }

  // Tiene peso → sugerir incremento progresivo
  const incremento =
    pesoActual < 10 ? 1 : pesoActual < 30 ? 2.5 : pesoActual < 60 ? 5 : 7.5;
  const nuevoPeso = pesoActual + incremento;
  return {
    tipo: "progresar_peso",
    texto: `Última vez RIR ${rir}: sube de ${pesoActual} a ${nuevoPeso} kg`,
    parche: { peso: `${nuevoPeso} kg` },
  };
}

/**
 * Extrae el historial de un ejercicio para una clienta a partir de
 * `sesiones.registros` (JSONB con {elemento_id: {series_realizadas, ...}}).
 *
 * No requiere queries adicionales: se le pasan las sesiones ya cargadas.
 */
export function calcularHistorialEjercicio(
  ejercicioId: string,
  sesiones: Array<{
    fecha: string;
    completada: boolean;
    porcentaje_completado: number;
    registros: Record<string, unknown> | null;
  }>
): HistorialEjercicio {
  let vecesHechas = 0;
  let ultimaFecha: string | null = null;
  let ultimaSerie: SerieEjercicio | null = null;
  let ultimaCompletada = false;
  let ultimoRir: number | null = null;
  let ultimasMediaReps: number | null = null;
  let pesoMaxKg: number | null = null;

  // Ordenar de más reciente a más antigua
  const ordenadas = [...sesiones].sort((a, b) =>
    b.fecha.localeCompare(a.fecha)
  );

  for (const s of ordenadas) {
    const registros = s.registros ?? {};
    // Recorrer claves: alguna podría matchear el ejercicio_id O un witemId
    // que represente este ejercicio. Patrón flexible: buscar cualquier
    // entrada cuyo elemento mencione este id.
    for (const [k, v] of Object.entries(registros)) {
      const reg = v as {
        ejercicio_id?: string;
        series_realizadas?: SerieEjercicio[];
      };
      if (reg.ejercicio_id === ejercicioId || k === ejercicioId) {
        vecesHechas++;
        const series = reg.series_realizadas ?? [];
        if (series.length > 0) {
          if (!ultimaSerie) {
            ultimaSerie = series[series.length - 1] ?? null;
            ultimaFecha = s.fecha;
            ultimaCompletada = s.completada;
            const rirs = series
              .map((sr) => parsearNumero(sr.rir))
              .filter((n): n is number => n != null);
            if (rirs.length > 0) {
              ultimoRir = Math.round(
                rirs.reduce((a, b) => a + b, 0) / rirs.length
              );
            }
            const reps = series
              .map((sr) => parsearNumero(sr.reps))
              .filter((n): n is number => n != null);
            if (reps.length > 0) {
              ultimasMediaReps = Math.round(
                reps.reduce((a, b) => a + b, 0) / reps.length
              );
            }
          }
          // Peso máximo absoluto
          for (const sr of series) {
            const p = parsearNumero(sr.peso);
            if (p != null && (pesoMaxKg == null || p > pesoMaxKg)) {
              pesoMaxKg = p;
            }
          }
        }
      }
    }
  }

  return {
    vecesHechas,
    ultimaFecha,
    ultimaSerie,
    ultimasMediaReps,
    pesoMaxKg,
    ultimaCompletada,
    ultimoRir,
  };
}
