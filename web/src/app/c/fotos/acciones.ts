"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ResultadoAccion = { ok: true } | { ok: false; error: string };

export async function registrarMiFoto(
  url: string,
  tipo: string | null,
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

  if (!url || !fecha) return { ok: false, error: "Faltan datos." };

  const { error } = await supabase.from("fotos_progreso").insert({
    coach_id: clienta.coach_id,
    clienta_id: clienta.id,
    url,
    tipo,
    fecha,
    notas,
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/c/fotos");
  return { ok: true };
}

export async function eliminarMiFoto(id: string): Promise<ResultadoAccion> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("fotos_progreso").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/c/fotos");
  return { ok: true };
}
