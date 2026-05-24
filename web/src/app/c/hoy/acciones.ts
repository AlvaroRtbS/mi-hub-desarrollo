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
      return {
        ok: false,
        error: errCrear?.message ?? "No se pudo crear la sesión.",
      };
    }
    sesionId = nueva.id;
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
  registros[input.elementoId] = { series_realizadas: series };

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
    if (error) return { ok: false, error: error.message };
  }

  // Disparar recálculo de logros — no esperamos a la respuesta
  // (fetch desde el server al propio endpoint con auth cookie)
  // Simplificado: lo hacemos en la siguiente carga; el cron diario también lo recalcula.

  revalidatePath("/c/hoy");
  revalidatePath("/c/programa");
  return { ok: true };
}
