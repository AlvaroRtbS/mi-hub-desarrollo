"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { DietaRestricciones } from "@/lib/dieta";

export type ResultadoAccion = { ok: true } | { ok: false; error: string };

/** Guarda el perfil dietético (restricciones) de una clienta. */
export async function guardarPerfilDietetico(
  clientaId: string,
  restricciones: DietaRestricciones
): Promise<ResultadoAccion> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "No autorizado." };

  const limpio: DietaRestricciones = {
    flags: Array.isArray(restricciones.flags) ? restricciones.flags : [],
    notas: (restricciones.notas ?? "").trim() || undefined,
  };

  const { error } = await supabase
    .from("clientas")
    .update({ dieta_restricciones: limpio })
    .eq("id", clientaId);

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/clientas/${clientaId}`);
  return { ok: true };
}
