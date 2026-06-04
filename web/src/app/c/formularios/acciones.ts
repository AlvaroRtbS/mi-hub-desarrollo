"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { FORMULARIO_INICIAL_TIPO } from "@/lib/formulario-inicial";

export type ResultadoAccion = { ok: true } | { ok: false; error: string };

export async function guardarFormularioInicial(
  respuestas: Record<string, string>,
  completar: boolean
): Promise<ResultadoAccion> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "No autenticada." };

  const { data: clienta } = await supabase
    .from("clientas")
    .select("id, coach_id")
    .eq("user_id", user.id)
    .maybeSingle<{ id: string; coach_id: string }>();
  if (!clienta) return { ok: false, error: "No eres una clienta." };

  const { error } = await supabase.from("formulario_respuestas").upsert(
    {
      coach_id: clienta.coach_id,
      clienta_id: clienta.id,
      tipo: FORMULARIO_INICIAL_TIPO,
      respuestas,
      completado: completar,
      completado_en: completar ? new Date().toISOString() : null,
      actualizado_en: new Date().toISOString(),
    },
    { onConflict: "clienta_id,tipo" }
  );

  if (error) return { ok: false, error: error.message };

  revalidatePath("/c/formularios");
  revalidatePath("/c/hoy");
  return { ok: true };
}

/**
 * Guarda las respuestas de un formulario genérico asignado por el coach.
 * La clienta solo puede tocar su propia asignación (RLS lo garantiza).
 */
export async function guardarRespuestaFormulario(
  asignacionId: string,
  respuestas: Record<string, string | string[]>,
  completar: boolean
): Promise<ResultadoAccion> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "No autenticada." };

  const { error } = await supabase
    .from("formulario_asignaciones")
    .update({
      respuestas,
      completado: completar,
      completado_en: completar ? new Date().toISOString() : null,
      actualizado_en: new Date().toISOString(),
    })
    .eq("id", asignacionId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/c/formularios");
  revalidatePath("/c/hoy");
  return { ok: true };
}
