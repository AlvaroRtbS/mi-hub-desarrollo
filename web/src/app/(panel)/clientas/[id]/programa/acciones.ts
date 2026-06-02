"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { EstructuraPrograma } from "@/lib/supabase/tipos";

export type ResultadoAccion = { ok: true } | { ok: false; error: string };

async function obtenerCoachId(): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("coaches")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  return data?.id ?? null;
}

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
  const coachId = await obtenerCoachId();
  if (!coachId) return { ok: false, error: "No autenticada." };

  const { error } = await supabase
    .from("asignaciones")
    .update({ estructura_snapshot: estructura })
    .eq("id", asignacionId)
    .eq("coach_id", coachId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/clientas");
  revalidatePath("/calendario");
  return { ok: true };
}
