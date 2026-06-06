"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ResultadoComentario = { ok: true } | { ok: false; error: string };

/**
 * Guarda (o borra, si va vacío) el comentario del coach sobre una sesión.
 * La RLS de `sesiones` (coach scoped) garantiza que solo afecta a sesiones
 * del coach autenticado.
 */
export async function guardarComentarioCoach(
  sesionId: string,
  clientaId: string,
  texto: string
): Promise<ResultadoComentario> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "No autenticada." };

  const limpio = texto.trim();
  const { error } = await supabase
    .from("sesiones")
    .update({ comentario_coach: limpio || null })
    .eq("id", sesionId);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/clientas/${clientaId}`);
  return { ok: true };
}
