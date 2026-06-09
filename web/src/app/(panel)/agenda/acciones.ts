"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ResultadoAccion = { ok: true } | { ok: false; error: string };

async function obtenerCoachId(): Promise<{
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  coachId: string | null;
}> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, coachId: null };
  const { data } = await supabase
    .from("coaches")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle<{ id: string }>();
  return { supabase, coachId: data?.id ?? null };
}

function fechaValida(iso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const d = new Date(iso + "T00:00:00Z");
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === iso;
}

export async function crearTareaCoach(
  texto: string,
  vence: string | null
): Promise<ResultadoAccion> {
  const { supabase, coachId } = await obtenerCoachId();
  if (!coachId) return { ok: false, error: "No autenticada." };

  const limpio = texto.trim();
  if (!limpio) return { ok: false, error: "Escribe la tarea." };
  if (limpio.length > 500) return { ok: false, error: "Tarea demasiado larga." };
  if (vence && !fechaValida(vence))
    return { ok: false, error: "Fecha de vencimiento no válida." };

  const { error } = await supabase.from("tareas_coach").insert({
    coach_id: coachId,
    texto: limpio,
    vence: vence || null,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/agenda");
  return { ok: true };
}

export async function alternarTareaCoach(
  id: string,
  hecha: boolean
): Promise<ResultadoAccion> {
  const { supabase, coachId } = await obtenerCoachId();
  if (!coachId) return { ok: false, error: "No autenticada." };

  const { error } = await supabase
    .from("tareas_coach")
    .update({ hecha, completada_en: hecha ? new Date().toISOString() : null })
    .eq("id", id)
    .eq("coach_id", coachId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/agenda");
  return { ok: true };
}

export async function eliminarTareaCoach(id: string): Promise<ResultadoAccion> {
  const { supabase, coachId } = await obtenerCoachId();
  if (!coachId) return { ok: false, error: "No autenticada." };

  const { error } = await supabase
    .from("tareas_coach")
    .delete()
    .eq("id", id)
    .eq("coach_id", coachId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/agenda");
  return { ok: true };
}
