"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ResultadoShare =
  | { ok: true; token: string }
  | { ok: false; error: string };

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

export async function crearTokenCompartir(
  asignacionId: string,
  clientaId: string
): Promise<ResultadoShare> {
  const supabase = await createSupabaseServerClient();
  const coachId = await obtenerCoachId();
  if (!coachId) return { ok: false, error: "No autenticada." };

  // Reusar token existente si lo hay (no spamear tokens)
  const { data: existente } = await supabase
    .from("asignacion_share_tokens")
    .select("token")
    .eq("asignacion_id", asignacionId)
    .maybeSingle();

  if (existente) {
    return { ok: true, token: existente.token };
  }

  const { data, error } = await supabase
    .from("asignacion_share_tokens")
    .insert({
      asignacion_id: asignacionId,
      coach_id: coachId,
    })
    .select("token")
    .single();

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/clientas/${clientaId}`);
  return { ok: true, token: data.token };
}

export async function revocarTokenCompartir(
  asignacionId: string,
  clientaId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("asignacion_share_tokens")
    .delete()
    .eq("asignacion_id", asignacionId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/clientas/${clientaId}`);
  return { ok: true };
}
