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

export async function crearObjetivo(formData: FormData): Promise<ResultadoAccion> {
  const supabase = await createSupabaseServerClient();
  const coachId = await obtenerCoachId();
  if (!coachId) return { ok: false, error: "No autenticada." };

  const clientaId = String(formData.get("clienta_id") ?? "").trim();
  const titulo = String(formData.get("titulo") ?? "").trim();
  const descripcion = String(formData.get("descripcion") ?? "").trim() || null;
  const tipo = String(formData.get("tipo") ?? "libre").trim();
  const valorInicialRaw = String(formData.get("valor_inicial") ?? "").trim();
  const valorObjetivoRaw = String(formData.get("valor_objetivo") ?? "").trim();
  const unidad = String(formData.get("unidad") ?? "").trim() || null;
  const fechaLimite = String(formData.get("fecha_limite") ?? "").trim() || null;

  if (!clientaId || !titulo) {
    return { ok: false, error: "Faltan datos obligatorios." };
  }

  const valorInicial = valorInicialRaw ? Number(valorInicialRaw) : null;
  const valorObjetivo = valorObjetivoRaw ? Number(valorObjetivoRaw) : null;

  const { data, error } = await supabase
    .from("objetivos")
    .insert({
      coach_id: coachId,
      clienta_id: clientaId,
      titulo,
      descripcion,
      tipo,
      valor_inicial: valorInicial,
      valor_objetivo: valorObjetivo,
      unidad,
      fecha_limite: fechaLimite,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/clientas/${clientaId}`);
  return { ok: true, id: data.id };
}

export async function cambiarEstadoObjetivo(
  id: string,
  clientaId: string,
  estado: "activo" | "conseguido" | "archivado"
): Promise<ResultadoAccion> {
  const supabase = await createSupabaseServerClient();
  const update: Record<string, unknown> = { estado };
  if (estado === "conseguido") update.conseguido_en = new Date().toISOString();
  if (estado === "activo") update.conseguido_en = null;
  const { error } = await supabase.from("objetivos").update(update).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/clientas/${clientaId}`);
  return { ok: true };
}

export async function eliminarObjetivo(
  id: string,
  clientaId: string
): Promise<ResultadoAccion> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("objetivos").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/clientas/${clientaId}`);
  return { ok: true };
}
