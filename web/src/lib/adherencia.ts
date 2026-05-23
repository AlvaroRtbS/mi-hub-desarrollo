// ============================================================================
// Cálculo de adherencia / racha de una clienta
// ----------------------------------------------------------------------------
// Definiciones:
// - "racha actual" = número de días consecutivos hasta hoy (incluido) en los
//    que la clienta tiene una sesión completada (o un día programado de
//    descanso). Un día sin sesión y sin descanso rompe la racha.
// - "racha máxima" = la mejor racha que ha tenido alguna vez.
// - "% adherencia (últimas N semanas)" = sesiones completadas / sesiones
//    programadas (excluyendo descansos).
// ============================================================================

import type { EstructuraPrograma } from "@/lib/supabase/tipos";

export type DiaProgramado = {
  fecha: string; // YYYY-MM-DD
  esDescanso: boolean;
  tieneBloques: boolean;
};

export type SesionCompletada = {
  fecha: string;
  completada: boolean;
};

function fechaISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function sumarDias(iso: string, n: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return fechaISO(d);
}

function diasEntre(a: string, b: string): number {
  const fa = new Date(a + "T00:00:00Z");
  const fb = new Date(b + "T00:00:00Z");
  return Math.floor((fb.getTime() - fa.getTime()) / 86400000);
}

/**
 * Despliega una asignación en una lista de DiaProgramado (cada día calendario
 * cubierto por el programa). Útil para saber qué se esperaba que hiciese.
 */
export function diasProgramadosDeAsignacion(
  fechaInicio: string,
  estructura: EstructuraPrograma,
  hasta: string
): DiaProgramado[] {
  const dias: DiaProgramado[] = [];
  const totalSemanas = estructura.length;
  const limite = diasEntre(fechaInicio, hasta);

  for (let offset = 0; offset <= limite; offset++) {
    const semanaIdx = Math.floor(offset / 7);
    const diaIdx = offset % 7;
    if (semanaIdx >= totalSemanas) break;
    const dia = estructura[semanaIdx]?.dias[diaIdx];
    if (!dia) continue;
    dias.push({
      fecha: sumarDias(fechaInicio, offset),
      esDescanso: !!dia.descanso,
      tieneBloques: dia.bloques.length > 0,
    });
  }
  return dias;
}

export type ResumenAdherencia = {
  rachaActual: number;
  rachaMaxima: number;
  porcentajeAdherencia: number; // 0-100
  sesionesCompletadas: number;
  sesionesProgramadas: number;
};

export function calcularAdherencia(
  programados: DiaProgramado[],
  sesiones: SesionCompletada[]
): ResumenAdherencia {
  const completadasPorFecha = new Set(
    sesiones.filter((s) => s.completada).map((s) => s.fecha)
  );

  // Adherencia: solo cuentan los días que NO eran descanso y tenían bloques.
  const esperados = programados.filter(
    (d) => !d.esDescanso && d.tieneBloques
  );
  const completadas = esperados.filter((d) => completadasPorFecha.has(d.fecha))
    .length;
  const porcentaje =
    esperados.length === 0
      ? 0
      : Math.round((completadas / esperados.length) * 100);

  // Rachas: recorremos en orden cronológico. Cuenta si:
  //   - día de descanso (no rompe)
  //   - día con sesión completada
  // Rompe si día con bloques y SIN sesión completada.
  let racha = 0;
  let mejor = 0;
  const programadosOrdenados = [...programados].sort((a, b) =>
    a.fecha.localeCompare(b.fecha)
  );
  for (const d of programadosOrdenados) {
    if (d.esDescanso || !d.tieneBloques) {
      // No suma, no rompe (día neutro)
      continue;
    }
    if (completadasPorFecha.has(d.fecha)) {
      racha += 1;
      mejor = Math.max(mejor, racha);
    } else {
      racha = 0;
    }
  }

  return {
    rachaActual: racha,
    rachaMaxima: mejor,
    porcentajeAdherencia: porcentaje,
    sesionesCompletadas: completadas,
    sesionesProgramadas: esperados.length,
  };
}
