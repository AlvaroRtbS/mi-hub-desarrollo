"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ResultadoPasos = { ok: true } | { ok: false; error: string };

/**
 * Registro manual de pasos diarios por parte de la clienta. Upsert por
 * (clienta_id, fecha): si ya hay un registro ese día, lo actualiza.
 * Usa la sesión de la clienta (políticas pasos_clienta_* de RLS).
 */
export async function registrarPasosDiarios(
  pasos: number,
  fecha: string
): Promise<ResultadoPasos> {
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

  if (!Number.isFinite(pasos) || pasos < 0) {
    return { ok: false, error: "Introduce un número de pasos válido." };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return { ok: false, error: "Fecha inválida." };
  }

  const { error } = await supabase.from("pasos_diarios").upsert(
    {
      coach_id: clienta.coach_id,
      clienta_id: clienta.id,
      fecha,
      pasos,
      fuente: "manual",
    },
    { onConflict: "clienta_id,fecha" }
  );
  if (error) return { ok: false, error: error.message };

  revalidatePath("/c/metricas");
  return { ok: true };
}
