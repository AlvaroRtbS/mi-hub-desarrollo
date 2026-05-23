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

export async function crearNotaInterna(
  clientaId: string,
  contenido: string
): Promise<ResultadoAccion> {
  const supabase = await createSupabaseServerClient();
  const coachId = await obtenerCoachId();
  if (!coachId) return { ok: false, error: "No autenticada." };

  const texto = contenido.trim();
  if (!texto) return { ok: false, error: "La nota está vacía." };

  const { data, error } = await supabase
    .from("notas")
    .insert({
      coach_id: coachId,
      clienta_id: clientaId,
      contenido: texto,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/clientas/${clientaId}`);
  return { ok: true, id: data.id };
}

export async function eliminarNotaInterna(
  id: string,
  clientaId: string
): Promise<ResultadoAccion> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("notas").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/clientas/${clientaId}`);
  return { ok: true };
}
