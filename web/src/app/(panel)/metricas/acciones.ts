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

export async function crearMetrica(formData: FormData): Promise<ResultadoAccion> {
  const supabase = await createSupabaseServerClient();
  const coachId = await obtenerCoachId();
  if (!coachId) return { ok: false, error: "No autenticada." };

  const clientaId = String(formData.get("clienta_id") ?? "").trim();
  const tipo = String(formData.get("tipo") ?? "").trim();
  const valor = Number(formData.get("valor"));
  const unidad = String(formData.get("unidad") ?? "kg").trim();
  const fecha = String(formData.get("fecha") ?? "").trim();
  const notas = String(formData.get("notas") ?? "").trim() || null;

  if (!clientaId) return { ok: false, error: "Falta la clienta." };
  if (!tipo) return { ok: false, error: "Falta el tipo de métrica." };
  if (!Number.isFinite(valor) || valor < 0)
    return { ok: false, error: "Valor inválido." };
  if (!fecha) return { ok: false, error: "Falta la fecha." };

  const { data, error } = await supabase
    .from("metricas")
    .insert({
      coach_id: coachId,
      clienta_id: clientaId,
      tipo,
      valor,
      unidad,
      fecha,
      notas,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };

  revalidatePath("/metricas");
  revalidatePath(`/clientas/${clientaId}`);
  return { ok: true, id: data.id };
}

export async function eliminarMetrica(id: string): Promise<ResultadoAccion> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("metricas").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/metricas");
  return { ok: true };
}
