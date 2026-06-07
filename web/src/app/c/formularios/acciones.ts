"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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
