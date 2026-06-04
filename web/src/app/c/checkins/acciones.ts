"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ResultadoAccion = { ok: true } | { ok: false; error: string };

export async function guardarCheckin(
  semana: string,
  respuestas: Record<string, string>
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

  if (!/^\d{4}-\d{2}-\d{2}$/.test(semana)) {
    return { ok: false, error: "Semana no válida." };
  }

  const { error } = await supabase.from("checkins").upsert(
    {
      coach_id: clienta.coach_id,
      clienta_id: clienta.id,
      semana,
      respuestas,
    },
    { onConflict: "clienta_id,semana" }
  );

  if (error) return { ok: false, error: error.message };

  revalidatePath("/c/checkins");
  revalidatePath("/c/hoy");
  return { ok: true };
}
