"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { EstructuraPrograma } from "@/lib/supabase/tipos";

type SerieRealizada = {
  peso: string;
  reps: string;
  completado: boolean;
};

type RegistroElemento = {
  series_realizadas?: SerieRealizada[];
  /** Para elementos tipo pasos_prompt: número de pasos registrados. */
  pasos?: number | null;
  /** Para elementos tipo pasos_prompt: paths de capturas subidas por la clienta. */
  capturas?: string[];
  /** Comentario libre de la clienta sobre ESTE ejercicio (#2 huecos TS). */
  comentario?: string;
  /** Fotos adjuntas al ejercicio (paths en bucket fotos-progreso). */
  adjuntos?: string[];
};

type RegistrosSesion = Record<string, RegistroElemento>;

type ClienteSupabase = Awaited<ReturnType<typeof createSupabaseServerClient>>;

const MAX_REINTENTOS = 5;

/**
 * Escritura segura sobre `sesiones.registros` (JSONB) con BLOQUEO OPTIMISTA.
 *
 * El auto-save del entreno dispara varias escrituras casi simultáneas (marcar
 * serie + perder foco de peso/reps). Antes se hacía leer-modificar-escribir del
 * JSON completo sin atomicidad → la segunda escritura pisaba la primera (lost
 * update). Aquí:
 *   1. Leemos la sesión (incluido `actualizada_en`).
 *   2. Aplicamos el cambio sobre una copia de los registros.
 *   3. Hacemos UPDATE condicionado a que `actualizada_en` NO haya cambiado.
 *   4. Si 0 filas afectadas (otra escritura entró en medio) → reintentamos con
 *      el estado fresco. Si la sesión no existía, la creamos (con su propia
 *      gestión de carrera contra el índice único clienta_id+fecha).
 *
 * `aplicar` debe ser PURA (no mutar el argumento) y devolver los registros
 * nuevos + columnas extra opcionales (p. ej. porcentaje_completado).
 */
async function actualizarSesion(
  supabase: ClienteSupabase,
  base: {
    coachId: string;
    clientaId: string;
    fecha: string;
    semana: number;
    dia: number;
  },
  aplicar: (registros: RegistrosSesion) => {
    registros: RegistrosSesion;
    extra?: Record<string, unknown>;
  }
): Promise<{ ok: true } | { ok: false; error: string }> {
  let ultimoError: string | null = null;

  for (let intento = 0; intento < MAX_REINTENTOS; intento++) {
    const { data: existente } = await supabase
      .from("sesiones")
      .select("id, registros, actualizada_en")
      .eq("clienta_id", base.clientaId)
      .eq("fecha", base.fecha)
      .maybeSingle<{
        id: string;
        registros: RegistrosSesion | null;
        actualizada_en: string;
      }>();

    if (!existente) {
      const { registros, extra } = aplicar({});
      const { error } = await supabase.from("sesiones").insert({
        coach_id: base.coachId,
        clienta_id: base.clientaId,
        fecha: base.fecha,
        semana: base.semana,
        dia: base.dia,
        registros,
        ...(extra ?? {}),
      });
      if (!error) return { ok: true };
      // Carrera de creación (índice único clienta_id+fecha): otra petición creó
      // la fila a la vez. Guardamos el error y reintentamos: en la próxima
      // vuelta la encontraremos y haremos UPDATE en lugar de INSERT.
      ultimoError = error.message;
      continue;
    }

    const { registros, extra } = aplicar(existente.registros ?? {});
    const { data: filas, error } = await supabase
      .from("sesiones")
      .update({
        registros,
        ...(extra ?? {}),
        actualizada_en: new Date().toISOString(),
      })
      .eq("id", existente.id)
      .eq("actualizada_en", existente.actualizada_en)
      .select("id");
    if (error) return { ok: false, error: error.message };
    if (filas && filas.length > 0) return { ok: true };
    // 0 filas: otra escritura concurrente cambió `actualizada_en` entre el read
    // y el update → reintentar con el estado fresco.
  }

  return {
    ok: false,
    error:
      ultimoError ??
      "No se pudo guardar por escrituras simultáneas. Inténtalo de nuevo.",
  };
}

/**
 * Guarda (o actualiza) los datos reales de UNA serie de UN ejercicio en la
 * sesión del día. Si la sesión no existe, la crea. Recalcula automáticamente
 * porcentaje_completado y completada en función de cuántas series completadas
 * hay vs el total planificado del día (según estructura_snapshot).
 */
export async function guardarRegistroSerie(input: {
  clientaId: string;
  fecha: string; // YYYY-MM-DD
  semana: number; // 1-based
  dia: number; // 1-based
  elementoId: string;
  serieIdx: number; // 0-based
  parche: Partial<SerieRealizada>;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "No autenticada." };

  const { data: asign } = await supabase
    .from("asignaciones")
    .select("id, coach_id, estructura_snapshot")
    .eq("clienta_id", input.clientaId)
    .eq("activa", true)
    .order("creada_en", { ascending: false })
    .limit(1)
    .maybeSingle<{
      id: string;
      coach_id: string;
      estructura_snapshot: EstructuraPrograma;
    }>();
  if (!asign) return { ok: false, error: "No hay asignación activa." };

  const r = await actualizarSesion(
    supabase,
    {
      coachId: asign.coach_id,
      clientaId: input.clientaId,
      fecha: input.fecha,
      semana: input.semana,
      dia: input.dia,
    },
    (registros) => {
      // Merge en registros[elementoId].series_realizadas[serieIdx]
      const elementoReg = registros[input.elementoId] ?? {};
      const series = [...(elementoReg.series_realizadas ?? [])];
      while (series.length <= input.serieIdx) {
        series.push({ peso: "", reps: "", completado: false });
      }
      series[input.serieIdx] = { ...series[input.serieIdx]!, ...input.parche };
      const nuevos: RegistrosSesion = {
        ...registros,
        [input.elementoId]: { ...elementoReg, series_realizadas: series },
      };

      // Recalcular porcentaje a partir del snapshot del día
      const diaDef =
        asign.estructura_snapshot?.[input.semana - 1]?.dias?.[input.dia - 1];
      let totalSeriesDia = 0;
      let totalCompletado = 0;
      if (diaDef && !diaDef.descanso) {
        for (const b of diaDef.bloques ?? []) {
          for (const el of b.elementos ?? []) {
            if (el.tipo === "ejercicio") {
              totalSeriesDia += el.series?.length ?? 0;
              const reg = nuevos[el.id];
              if (reg?.series_realizadas) {
                for (const s of reg.series_realizadas) {
                  if (s.completado) totalCompletado += 1;
                }
              }
            }
          }
        }
      }
      const porcentaje =
        totalSeriesDia > 0
          ? Math.min(100, Math.round((totalCompletado / totalSeriesDia) * 100))
          : 0;

      return {
        registros: nuevos,
        extra: {
          porcentaje_completado: porcentaje,
          completada: porcentaje >= 100,
        },
      };
    }
  );

  if (r.ok) revalidatePath("/c/hoy");
  return r;
}

/**
 * Guarda el comentario de la clienta sobre UN ejercicio concreto del día
 * (#2 huecos TS). Se almacena en sesiones.registros[elementoId].comentario.
 * Crea la sesión del día si aún no existe. Además, al quitar fotos adjuntas,
 * borra los objetos huérfanos del bucket (evita fuga de almacenamiento).
 */
export async function guardarComentarioEjercicio(input: {
  clientaId: string;
  fecha: string;
  semana: number;
  dia: number;
  elementoId: string;
  comentario: string;
  adjuntos?: string[];
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "No autenticada." };

  const { data: clienta } = await supabase
    .from("clientas")
    .select("coach_id")
    .eq("id", input.clientaId)
    .maybeSingle<{ coach_id: string }>();
  if (!clienta) return { ok: false, error: "Clienta no encontrada." };

  let adjuntosAEliminar: string[] = [];

  const r = await actualizarSesion(
    supabase,
    {
      coachId: clienta.coach_id,
      clientaId: input.clientaId,
      fecha: input.fecha,
      semana: input.semana,
      dia: input.dia,
    },
    (registros) => {
      const prev = registros[input.elementoId] ?? {};
      const limpio = input.comentario.trim();
      const adjuntos = (input.adjuntos ?? []).filter(Boolean);
      // Adjuntos que estaban guardados y ya no están → a borrar del bucket.
      const prevAdj = prev.adjuntos ?? [];
      adjuntosAEliminar = prevAdj.filter((p) => !adjuntos.includes(p));
      return {
        registros: {
          ...registros,
          [input.elementoId]: {
            ...prev,
            comentario: limpio || undefined,
            adjuntos: adjuntos.length ? adjuntos : undefined,
          },
        },
      };
    }
  );

  if (r.ok && adjuntosAEliminar.length > 0) {
    // Best-effort: si falla el borrado del objeto, no revertimos el guardado.
    await supabase.storage.from("fotos-progreso").remove(adjuntosAEliminar);
  }
  if (r.ok) revalidatePath("/c/hoy");
  return r;
}

/**
 * Guarda la respuesta a un pasos_prompt: número de pasos y/o capturas
 * adjuntas. Si la sesión del día no existe, la crea.
 */
export async function guardarRegistroPasos(input: {
  clientaId: string;
  fecha: string;
  semana: number;
  dia: number;
  elementoId: string;
  pasos: number | null;
  capturas: string[];
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createSupabaseServerClient();
  const { data: clienta, error: errCl } = await supabase
    .from("clientas")
    .select("id, coach_id")
    .eq("id", input.clientaId)
    .maybeSingle<{ id: string; coach_id: string }>();
  if (errCl || !clienta) {
    return { ok: false, error: errCl?.message ?? "Clienta no encontrada." };
  }

  let capturasAEliminar: string[] = [];

  const r = await actualizarSesion(
    supabase,
    {
      coachId: clienta.coach_id,
      clientaId: input.clientaId,
      fecha: input.fecha,
      semana: input.semana,
      dia: input.dia,
    },
    (registros) => {
      const prev = registros[input.elementoId] ?? {};
      const prevCap = prev.capturas ?? [];
      capturasAEliminar = prevCap.filter((p) => !input.capturas.includes(p));
      return {
        registros: {
          ...registros,
          [input.elementoId]: {
            ...prev,
            pasos: input.pasos,
            capturas: input.capturas,
          },
        },
      };
    }
  );

  if (r.ok && capturasAEliminar.length > 0) {
    await supabase.storage.from("fotos-progreso").remove(capturasAEliminar);
  }
  if (r.ok) revalidatePath("/c/hoy");
  return r;
}

/**
 * Guarda el feedback post-sesión de la clienta (esfuerzo percibido y energía
 * 1-5 + comentario) sobre la sesión del día. La sesión ya debe existir
 * (se llama tras marcarla completada).
 */
export async function guardarFeedbackSesion(
  fecha: string,
  feedback: { esfuerzo?: string; energia?: string; comentario?: string }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "No autenticada." };

  const { data: clienta } = await supabase
    .from("clientas")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle<{ id: string }>();
  if (!clienta) return { ok: false, error: "No eres una clienta." };

  const { error } = await supabase
    .from("sesiones")
    .update({
      feedback: {
        esfuerzo: feedback.esfuerzo || null,
        energia: feedback.energia || null,
      },
      notas_clienta: feedback.comentario?.trim() || null,
    })
    .eq("clienta_id", clienta.id)
    .eq("fecha", fecha);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/c/hoy");
  return { ok: true };
}

export async function marcarSesionCompletada(
  clientaId: string,
  fecha: string,
  semana: number,
  dia: number,
  sesionId: string | null
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "No autenticada." };

  // Necesitamos el coach_id de la asignación para poder insertar
  const { data: asign } = await supabase
    .from("asignaciones")
    .select("coach_id")
    .eq("clienta_id", clientaId)
    .eq("activa", true)
    .order("creada_en", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!asign) return { ok: false, error: "No hay asignación activa." };

  if (sesionId) {
    const { error } = await supabase
      .from("sesiones")
      .update({ completada: true, porcentaje_completado: 100 })
      .eq("id", sesionId);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await supabase.from("sesiones").insert({
      coach_id: asign.coach_id,
      clienta_id: clientaId,
      fecha,
      semana,
      dia,
      completada: true,
      porcentaje_completado: 100,
    });
    if (error) {
      // Carrera: la sesión ya se creó a la vez. Marcarla como completada.
      const { data: ya } = await supabase
        .from("sesiones")
        .select("id")
        .eq("clienta_id", clientaId)
        .eq("fecha", fecha)
        .maybeSingle<{ id: string }>();
      if (!ya) return { ok: false, error: error.message };
      const { error: e2 } = await supabase
        .from("sesiones")
        .update({ completada: true, porcentaje_completado: 100 })
        .eq("id", ya.id);
      if (e2) return { ok: false, error: e2.message };
    }
  }

  // Disparar recálculo de logros — no esperamos a la respuesta
  // (fetch desde el server al propio endpoint con auth cookie)
  // Simplificado: lo hacemos en la siguiente carga; el cron diario también lo recalcula.

  revalidatePath("/c/hoy");
  revalidatePath("/c/programa");
  return { ok: true };
}
