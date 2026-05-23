"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ResultadoAccion = { ok: true; id?: string } | { ok: false; error: string };

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

export async function añadirFoto(formData: FormData): Promise<ResultadoAccion> {
  const supabase = await createSupabaseServerClient();
  const coachId = await obtenerCoachId();
  if (!coachId) return { ok: false, error: "No autenticada." };

  const clientaId = String(formData.get("clienta_id") ?? "").trim();
  const url = String(formData.get("url") ?? "").trim();
  const tipo = String(formData.get("tipo") ?? "").trim() || null;
  const fecha = String(formData.get("fecha") ?? "").trim();
  const notas = String(formData.get("notas") ?? "").trim() || null;

  if (!clientaId || !url || !fecha) {
    return { ok: false, error: "Faltan datos." };
  }

  const { data, error } = await supabase
    .from("fotos_progreso")
    .insert({
      coach_id: coachId,
      clienta_id: clientaId,
      url,
      tipo,
      fecha,
      notas,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/clientas/${clientaId}/fotos`);
  revalidatePath(`/clientas/${clientaId}`);
  return { ok: true, id: data.id };
}

export async function eliminarFoto(
  id: string,
  clientaId: string
): Promise<ResultadoAccion> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("fotos_progreso").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/clientas/${clientaId}/fotos`);
  return { ok: true };
}

export async function alternarComparador(
  clientaId: string,
  activo: boolean
): Promise<ResultadoAccion> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("clientas")
    .update({ comparador_fotos_activo: activo })
    .eq("id", clientaId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/clientas/${clientaId}/fotos`);
  revalidatePath(`/clientas/${clientaId}`);
  return { ok: true };
}
