"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hoyISO } from "@/lib/utilidades";

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
  // Fecha bien formada y no futura: una foto "de 2099" rompería el orden
  // cronológico del comparador antes/ahora.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || fecha > hoyISO())
    return { ok: false, error: "La fecha de la foto no es válida." };

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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "No autenticada." };

  const { data: clienta } = await supabase
    .from("clientas")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle<{ id: string }>();
  if (!clienta) return { ok: false, error: "No eres una clienta." };

  // Leer el path del objeto ANTES de borrar la fila (scoped a la clienta).
  const { data: foto } = await supabase
    .from("fotos_progreso")
    .select("url")
    .eq("id", id)
    .eq("clienta_id", clienta.id)
    .maybeSingle<{ url: string }>();

  const { error } = await supabase
    .from("fotos_progreso")
    .delete()
    .eq("id", id)
    .eq("clienta_id", clienta.id);
  if (error) return { ok: false, error: error.message };

  // Borrar el objeto del bucket para no dejar huérfanos (best-effort: si falla
  // el borrado del archivo no revertimos el borrado de la fila).
  if (foto?.url) {
    await supabase.storage.from("fotos-progreso").remove([foto.url]);
  }

  revalidatePath("/c/fotos");
  return { ok: true };
}
