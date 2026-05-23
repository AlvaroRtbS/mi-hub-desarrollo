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

export async function crearGrupo(formData: FormData): Promise<ResultadoAccion> {
  const supabase = await createSupabaseServerClient();
  const coachId = await obtenerCoachId();
  if (!coachId) return { ok: false, error: "No autenticada." };

  const nombre = String(formData.get("nombre") ?? "").trim();
  const color = String(formData.get("color") ?? "").trim() || null;
  if (!nombre) return { ok: false, error: "El nombre es obligatorio." };

  const { data, error } = await supabase
    .from("grupos")
    .insert({ coach_id: coachId, nombre, color })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };

  revalidatePath("/clientas/grupos");
  revalidatePath("/clientas");
  return { ok: true, id: data.id };
}

export async function eliminarGrupo(id: string): Promise<ResultadoAccion> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("grupos").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/clientas/grupos");
  revalidatePath("/clientas");
  return { ok: true };
}

export async function asignarClientaAGrupo(
  clientaId: string,
  grupoId: string
): Promise<ResultadoAccion> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("clienta_grupos")
    .insert({ clienta_id: clientaId, grupo_id: grupoId });
  if (error) {
    if (error.code === "23505") return { ok: true }; // ya está
    return { ok: false, error: error.message };
  }
  revalidatePath(`/clientas/${clientaId}`);
  revalidatePath("/clientas");
  return { ok: true };
}

export async function quitarClientaDeGrupo(
  clientaId: string,
  grupoId: string
): Promise<ResultadoAccion> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("clienta_grupos")
    .delete()
    .eq("clienta_id", clientaId)
    .eq("grupo_id", grupoId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/clientas/${clientaId}`);
  revalidatePath("/clientas");
  return { ok: true };
}
