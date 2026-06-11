"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ResultadoAccion = { ok: true } | { ok: false; error: string };

export async function registrarMiMetrica(
  tipo: string,
  valor: number,
  unidad: string,
  fecha: string,
  notas: string | null
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
    .maybeSingle();

  if (!clienta) return { ok: false, error: "No eres una clienta." };

  if (!Number.isFinite(valor) || valor < 0)
    return { ok: false, error: "Valor inválido." };

  const { error } = await supabase.from("metricas").insert({
    coach_id: clienta.coach_id,
    clienta_id: clienta.id,
    tipo,
    valor,
    unidad,
    fecha,
    notas,
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/c/metricas");
  revalidatePath("/c/hoy");
  return { ok: true };
}
