"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { PreguntaForm } from "@/lib/formularios";

export type ResultadoAccion = { ok: true } | { ok: false; error: string };
export type ResultadoCrear =
  | { ok: true; id: string }
  | { ok: false; error: string };

async function coachActual() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, coachId: null as string | null };
  const { data: coach } = await supabase
    .from("coaches")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle<{ id: string }>();
  return { supabase, coachId: coach?.id ?? null };
}

/** Crea un formulario vacío y devuelve su id para ir al constructor. */
export async function crearFormulario(): Promise<ResultadoCrear> {
  const { supabase, coachId } = await coachActual();
  if (!coachId) return { ok: false, error: "No autorizado." };

  const { data, error } = await supabase
    .from("formularios")
    .insert({ coach_id: coachId, titulo: "Formulario sin título", preguntas: [] })
    .select("id")
    .single<{ id: string }>();

  if (error) return { ok: false, error: error.message };
  revalidatePath("/formularios");
  return { ok: true, id: data.id };
}

/** Actualiza título, descripción y preguntas de un formulario. */
export async function actualizarFormulario(
  id: string,
  datos: { titulo: string; descripcion: string | null; preguntas: PreguntaForm[] }
): Promise<ResultadoAccion> {
  const { supabase, coachId } = await coachActual();
  if (!coachId) return { ok: false, error: "No autorizado." };

  if (!datos.titulo.trim()) return { ok: false, error: "El título no puede estar vacío." };

  const { error } = await supabase
    .from("formularios")
    .update({
      titulo: datos.titulo.trim(),
      descripcion: datos.descripcion?.trim() || null,
      preguntas: datos.preguntas,
      actualizado_en: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/formularios");
  revalidatePath(`/formularios/${id}`);
  return { ok: true };
}

/** Borra un formulario (y sus asignaciones por cascade). */
export async function eliminarFormulario(id: string): Promise<ResultadoAccion> {
  const { supabase, coachId } = await coachActual();
  if (!coachId) return { ok: false, error: "No autorizado." };

  const { error } = await supabase.from("formularios").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/formularios");
  return { ok: true };
}

/** Asigna el formulario a una clienta (idempotente). */
export async function asignarFormulario(
  formularioId: string,
  clientaId: string
): Promise<ResultadoAccion> {
  const { supabase, coachId } = await coachActual();
  if (!coachId) return { ok: false, error: "No autorizado." };

  const { error } = await supabase
    .from("formulario_asignaciones")
    .upsert(
      { formulario_id: formularioId, coach_id: coachId, clienta_id: clientaId },
      { onConflict: "formulario_id,clienta_id", ignoreDuplicates: true }
    );

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/formularios/${formularioId}`);
  return { ok: true };
}

/** Quita la asignación de una clienta (borra también sus respuestas). */
export async function desasignarFormulario(
  formularioId: string,
  clientaId: string
): Promise<ResultadoAccion> {
  const { supabase, coachId } = await coachActual();
  if (!coachId) return { ok: false, error: "No autorizado." };

  const { error } = await supabase
    .from("formulario_asignaciones")
    .delete()
    .eq("formulario_id", formularioId)
    .eq("clienta_id", clientaId);

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/formularios/${formularioId}`);
  return { ok: true };
}
