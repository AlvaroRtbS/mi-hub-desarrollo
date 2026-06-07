"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ResultadoMetrica = { ok: true } | { ok: false; error: string };

async function clientaActual() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, clientaId: null as string | null };
  const { data: clienta } = await supabase
    .from("clientas")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle<{ id: string }>();
  return { supabase, clientaId: clienta?.id ?? null };
}

/** Corrige el valor (y opcionalmente la fecha) de una métrica propia. */
export async function editarMiMetrica(
  id: string,
  valor: number,
  fecha?: string
): Promise<ResultadoMetrica> {
  const { supabase, clientaId } = await clientaActual();
  if (!clientaId) return { ok: false, error: "No autenticada." };
  if (!Number.isFinite(valor) || valor < 0) {
    return { ok: false, error: "Valor inválido." };
  }
  const parche: { valor: number; fecha?: string } = { valor };
  if (fecha) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      return { ok: false, error: "Fecha inválida." };
    }
    parche.fecha = fecha;
  }
  const { error } = await supabase
    .from("metricas")
    .update(parche)
    .eq("id", id)
    .eq("clienta_id", clientaId); // belt-and-suspenders (RLS ya lo limita)
  if (error) return { ok: false, error: error.message };
  revalidatePath("/c/metricas");
  return { ok: true };
}

/** Borra una métrica propia (p. ej. un valor mal tecleado). */
export async function borrarMiMetrica(id: string): Promise<ResultadoMetrica> {
  const { supabase, clientaId } = await clientaActual();
  if (!clientaId) return { ok: false, error: "No autenticada." };
  const { error } = await supabase
    .from("metricas")
    .delete()
    .eq("id", id)
    .eq("clienta_id", clientaId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/c/metricas");
  return { ok: true };
}
