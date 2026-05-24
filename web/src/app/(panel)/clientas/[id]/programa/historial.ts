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
 * Sugerencia de progresión generada por heurística:
 *   - Si completó al 100% con RIR bajo (≤1) → progresar.
 *   - Si completó pero sin RIR registrado → progresar con cautela
 *     (asumimos margen, solo si fue reciente; si pasó >14d, "reintroduce").
 *   - Si tiene peso (gym): subir peso pequeño (+2.5 kg o +5%).
 *   - Si NO tiene peso (entreno en casa, peso corporal, bandas):
 *       sugerir +2 reps o "variante más difícil".
 *   - Si falló (no completó) → mantener / bajar volumen.
 *   - Si llevamos >14 días sin que lo haga → "reintroduce, no progreses".
 *   - Sin historial → "primera vez".
 */
export type Sugerencia = {
  tipo:
    | "progresar_peso"
    | "progresar_reps"
    | "variante_dificil"
    | "consolidar"
    | "regresar"
    | "reintroducir"
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
function diasDesde(iso: string): number {
  return Math.floor(
    (Date.now() - new Date(iso + "T00:00:00Z").getTime()) / 86400000
  );
}

function calcularIncrementoPeso(pesoActual: number): number {
  if (pesoActual < 10) return 1;
  if (pesoActual < 30) return 2.5;
  if (pesoActual < 60) return 5;
  return 7.5;
}

function progresionPorPeso(
  pesoActual: number,
  rirInfo: string
): Sugerencia {
  const incremento = calcularIncrementoPeso(pesoActual);
  const nuevoPeso = pesoActual + incremento;
  return {
    tipo: "progresar_peso",
    texto: `${rirInfo}: sube de ${pesoActual} a ${nuevoPeso} kg`,
    parche: { peso: `${nuevoPeso} kg` },
  };
}

function progresionPorReps(
  repsActual: number | null,
  rirInfo: string
): Sugerencia {
  if (repsActual && repsActual >= 15) {
    return {
      tipo: "variante_dificil",
      texto:
        "Reps ya altas + carga ligera: prueba variante más difícil (unilateral, tempo lento, isométrico, mayor ROM)",
    };
  }
  const nuevasReps = repsActual ? Math.round(repsActual + 2) : null;
  return {
    tipo: "progresar_reps",
    texto: nuevasReps
      ? `${rirInfo}: sube a ~${nuevasReps} reps esta semana`
      : `${rirInfo}: añade 2 reps esta semana`,
    parche: nuevasReps ? { reps: String(nuevasReps) } : undefined,
  };
}

export function sugerirProgresion(
  historial: HistorialEjercicio,
  serieActual: SerieEjercicio,
  sinPesoLibre: boolean
): Sugerencia {
  if (historial.vecesHechas === 0) {
    return { tipo: "primera_vez", texto: "Primera vez — observa cómo lo hace" };
  }

  // Si lleva más de 14 días sin hacer el ejercicio, no progresar
  // a ciegas: introducirlo de nuevo con la carga anterior para evaluar.
  const diasDesdeUltima = historial.ultimaFecha
    ? diasDesde(historial.ultimaFecha)
    : null;
  if (diasDesdeUltima != null && diasDesdeUltima > 14) {
    return {
      tipo: "reintroducir",
      texto: `Hace ${diasDesdeUltima} días que no lo hace — reintroduce con la misma carga, observa, ya progresarás`,
    };
  }

  if (!historial.ultimaCompletada) {
    return {
      tipo: "regresar",
      texto: "No completó la última vez — consolida o baja volumen",
    };
  }

  const rir = historial.ultimoRir;
  const pesoActual = parsearNumero(serieActual.peso);
  const repsActual = parsearNumero(serieActual.reps);

  // CON RIR explícito: heurística más segura
  if (rir != null) {
    if (rir >= 2 && rir <= 3) {
      return {
        tipo: "consolidar",
        texto: `Último RIR ${rir} (medio) — buen progreso, mantén otra sesión`,
      };
    }
    if (rir >= 4) {
      return {
        tipo: "consolidar",
        texto: `Último RIR ${rir} (muy reservado) — sube reps ligeramente o ajusta técnica`,
      };
    }
    // RIR ≤ 1 → progresar
    const rirInfo = `Última vez RIR ${rir}`;
    if (sinPesoLibre || !pesoActual || pesoActual === 0) {
      return progresionPorReps(repsActual, rirInfo);
    }
    return progresionPorPeso(pesoActual, rirInfo);
  }

  // SIN RIR: heurística por volumen completado + tiempo
  // Si completó al 100% recientemente, sugerir progresión cauta.
  // No tenemos certeza del esfuerzo, así que avisamos.
  const sufijo =
    "(la clienta no marcó RIR, sugerencia con cautela — confírma con ella)";
  if (sinPesoLibre || !pesoActual || pesoActual === 0) {
    if (repsActual && repsActual >= 15) {
      return {
        tipo: "variante_dificil",
        texto: `Completada con reps altas ${sufijo}: prueba variante más difícil`,
      };
    }
    const nuevasReps = repsActual ? Math.round(repsActual + 1) : null;
    return {
      tipo: "progresar_reps",
      texto: nuevasReps
        ? `Completada ${sufijo}: prueba ${nuevasReps} reps`
        : `Completada ${sufijo}: añade 1 rep`,
      parche: nuevasReps ? { reps: String(nuevasReps) } : undefined,
    };
  }
  // Peso: incremento mínimo
  const incremento = Math.max(1, calcularIncrementoPeso(pesoActual) / 2);
  const nuevoPeso = pesoActual + incremento;
  return {
    tipo: "progresar_peso",
    texto: `Completada ${sufijo}: prueba +${incremento} kg (de ${pesoActual} a ${nuevoPeso})`,
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
