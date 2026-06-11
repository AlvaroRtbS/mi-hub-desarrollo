"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hoyISO } from "@/lib/utilidades";

export type ResultadoAccion = { ok: true } | { ok: false; error: string };

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

  // La UI ya oculta los formularios aún no disponibles, pero la fecha de
  // apertura también se valida aquí para que no baste con llamar a la acción.
  const { data: asignacion } = await supabase
    .from("formulario_asignaciones")
    .select("id, disponible_desde")
    .eq("id", asignacionId)
    .maybeSingle<{ id: string; disponible_desde: string | null }>();
  if (!asignacion) return { ok: false, error: "Formulario no encontrado." };
  if (asignacion.disponible_desde && asignacion.disponible_desde > hoyISO())
    return { ok: false, error: "Este formulario aún no está disponible." };

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
