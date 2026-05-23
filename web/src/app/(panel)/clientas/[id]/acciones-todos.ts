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

export async function crearTodo(
  clientaId: string,
  titulo: string,
  fechaLimite: string | null
): Promise<ResultadoAccion> {
  const supabase = await createSupabaseServerClient();
  const coachId = await obtenerCoachId();
  if (!coachId) return { ok: false, error: "No autenticada." };

  const limpio = titulo.trim();
  if (!limpio) return { ok: false, error: "Escribe algo." };

  const { data, error } = await supabase
    .from("todos_clienta")
    .insert({
      coach_id: coachId,
      clienta_id: clientaId,
      titulo: limpio,
      fecha_limite: fechaLimite || null,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/clientas/${clientaId}`);
  return { ok: true, id: data.id };
}

export async function alternarTodo(
  id: string,
  clientaId: string,
  completado: boolean
): Promise<ResultadoAccion> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("todos_clienta")
    .update({
      completado,
      completado_en: completado ? new Date().toISOString() : null,
    })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/clientas/${clientaId}`);
  return { ok: true };
}

export async function eliminarTodo(
  id: string,
  clientaId: string
): Promise<ResultadoAccion> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("todos_clienta").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/clientas/${clientaId}`);
  return { ok: true };
}
