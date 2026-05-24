"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { EstructuraPrograma } from "@/lib/supabase/tipos";

export type ResultadoAccion = { ok: true } | { ok: false; error: string };

/**
 * Guarda el estructura_snapshot modificado de una asignación.
 * Permite que la coach personalice el plan de UNA clienta sin tocar
 * el programa-plantilla base ni a las demás clientas que lo tienen
 * asignado.
 */
export async function guardarSnapshotAsignacion(
  asignacionId: string,
  estructura: EstructuraPrograma
): Promise<ResultadoAccion> {
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from("asignaciones")
    .update({ estructura_snapshot: estructura })
    .eq("id", asignacionId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/clientas");
  return { ok: true };
}
