"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ResultadoInvitacion =
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

export async function generarInvitacion(
  clientaId: string
): Promise<ResultadoInvitacion> {
  const supabase = await createSupabaseServerClient();
  const coachId = await obtenerCoachId();
  if (!coachId) return { ok: false, error: "No autenticada." };

  // Verifica si ya hay una invitación válida (no usada y no expirada)
  const { data: existente } = await supabase
    .from("invitaciones_clienta")
    .select("token")
    .eq("clienta_id", clientaId)
    .is("usada_en", null)
    .gt("expira_en", new Date().toISOString())
    .maybeSingle();

  if (existente) {
    return { ok: true, token: existente.token };
  }

  const { data, error } = await supabase
    .from("invitaciones_clienta")
    .insert({
      clienta_id: clientaId,
      coach_id: coachId,
    })
    .select("token")
    .single();

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/clientas/${clientaId}`);
  return { ok: true, token: data.token };
}

export async function revocarInvitacion(
  clientaId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("invitaciones_clienta")
    .delete()
    .eq("clienta_id", clientaId)
    .is("usada_en", null);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/clientas/${clientaId}`);
  return { ok: true };
}
