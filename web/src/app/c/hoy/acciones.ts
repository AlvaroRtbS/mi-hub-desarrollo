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

  // Obtener sesión existente o crear vacía
  const { data: existente } = await supabase
    .from("sesiones")
    .select("id, registros")
    .eq("clienta_id", input.clientaId)
    .eq("fecha", input.fecha)
    .maybeSingle<{ id: string; registros: RegistrosSesion | null }>();

  let sesionId = existente?.id ?? null;
  const registros: RegistrosSesion = existente?.registros ?? {};

  if (!sesionId) {
    const { data: nueva, error: errCrear } = await supabase
      .from("sesiones")
      .insert({
        coach_id: asign.coach_id,
        clienta_id: input.clientaId,
        fecha: input.fecha,
        semana: input.semana,
        dia: input.dia,
        completada: false,
        porcentaje_completado: 0,
        registros: {},
      })
      .select("id")
      .single<{ id: string }>();
    if (errCrear || !nueva) {
      // Posible condición de carrera (doble guardado simultáneo): otra petición
      // creó la sesión del día a la vez y chocó con el índice único
      // (clienta_id, fecha). Reusamos la fila ya existente y mezclamos lo que
      // la otra petición hubiera guardado, en vez de devolver error.
      const { data: ya } = await supabase
        .from("sesiones")
        .select("id, registros")
        .eq("clienta_id", input.clientaId)
        .eq("fecha", input.fecha)
        .maybeSingle<{ id: string; registros: RegistrosSesion | null }>();
      if (!ya) {
        return {
          ok: false,
          error: errCrear?.message ?? "No se pudo crear la sesión.",
        };
      }
      sesionId = ya.id;
      Object.assign(registros, ya.registros ?? {});
    } else {
      sesionId = nueva.id;
    }
  }

  // Merge en registros[elementoId].series_realizadas[serieIdx]
  const elementoReg = registros[input.elementoId] ?? {};
  const series = (elementoReg.series_realizadas ?? []) as SerieRealizada[];
  while (series.length <= input.serieIdx) {
    series.push({ peso: "", reps: "", completado: false });
  }
  series[input.serieIdx] = {
    ...series[input.serieIdx]!,
    ...input.parche,
  };
  // Preserva otros campos del elemento (p.ej. comentario) al actualizar series.
  registros[input.elementoId] = { ...elementoReg, series_realizadas: series };

  // Recalcular porcentaje a partir del snapshot del día
  const semanaIdx = input.semana - 1;
  const diaIdx = input.dia - 1;
  const diaDef = asign.estructura_snapshot?.[semanaIdx]?.dias?.[diaIdx];
  let totalSeriesDia = 0;
  let totalCompletado = 0;
  if (diaDef && !diaDef.descanso) {
    for (const b of diaDef.bloques ?? []) {
      for (const el of b.elementos ?? []) {
        if (el.tipo === "ejercicio") {
          totalSeriesDia += el.series?.length ?? 0;
          const reg = registros[el.id];
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

  const { error: errUpd } = await supabase
    .from("sesiones")
    .update({
      registros,
      porcentaje_completado: porcentaje,
      completada: porcentaje >= 100,
    })
    .eq("id", sesionId);
  if (errUpd) return { ok: false, error: errUpd.message };

  revalidatePath("/c/hoy");
  return { ok: true };
}

/**
 * Guarda el comentario de la clienta sobre UN ejercicio concreto del día
 * (#2 huecos TS). Se almacena en sesiones.registros[elementoId].comentario.
 * Crea la sesión del día si aún no existe.
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

  const { data: existente } = await supabase
    .from("sesiones")
    .select("id, registros")
    .eq("clienta_id", input.clientaId)
    .eq("fecha", input.fecha)
    .maybeSingle<{ id: string; registros: RegistrosSesion | null }>();

  const registros: RegistrosSesion = existente?.registros ?? {};
  const limpio = input.comentario.trim();
  const adjuntos = (input.adjuntos ?? []).filter(Boolean);
  registros[input.elementoId] = {
    ...(registros[input.elementoId] ?? {}),
    comentario: limpio || undefined,
    adjuntos: adjuntos.length ? adjuntos : undefined,
  };

  if (existente) {
    const { error } = await supabase
      .from("sesiones")
      .update({ registros })
      .eq("id", existente.id);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await supabase.from("sesiones").insert({
      coach_id: clienta.coach_id,
      clienta_id: input.clientaId,
      fecha: input.fecha,
      semana: input.semana,
      dia: input.dia,
      registros,
    });
    if (error) return { ok: false, error: error.message };
  }

  revalidatePath("/c/hoy");
  return { ok: true };
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

  const { data: existente } = await supabase
    .from("sesiones")
    .select("id, registros")
    .eq("clienta_id", input.clientaId)
    .eq("fecha", input.fecha)
    .maybeSingle<{ id: string; registros: RegistrosSesion | null }>();

  const registros: RegistrosSesion = existente?.registros ?? {};
  const elementoReg = registros[input.elementoId] ?? {};
  registros[input.elementoId] = {
    ...elementoReg,
    pasos: input.pasos,
    capturas: input.capturas,
  };

  if (!existente) {
    const { error: errIns } = await supabase.from("sesiones").insert({
      coach_id: clienta.coach_id,
      clienta_id: input.clientaId,
      fecha: input.fecha,
      semana: input.semana,
      dia: input.dia,
      registros,
    });
    if (errIns) {
      // Carrera: otra petición creó la sesión a la vez. Reusar la existente y
      // fusionar este elemento sobre sus registros.
      const { data: ya } = await supabase
        .from("sesiones")
        .select("id, registros")
        .eq("clienta_id", input.clientaId)
        .eq("fecha", input.fecha)
        .maybeSingle<{ id: string; registros: RegistrosSesion | null }>();
      if (!ya) return { ok: false, error: errIns.message };
      const fusion: RegistrosSesion = {
        ...(ya.registros ?? {}),
        [input.elementoId]: registros[input.elementoId]!,
      };
      const { error: errUpd2 } = await supabase
        .from("sesiones")
        .update({ registros: fusion })
        .eq("id", ya.id);
      if (errUpd2) return { ok: false, error: errUpd2.message };
    }
  } else {
    const { error: errUpd } = await supabase
      .from("sesiones")
      .update({ registros })
      .eq("id", existente.id);
    if (errUpd) return { ok: false, error: errUpd.message };
  }

  revalidatePath("/c/hoy");
  return { ok: true };
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
