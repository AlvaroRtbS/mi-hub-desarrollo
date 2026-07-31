"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ResultadoAccion = { ok: true } | { ok: false; error: string };

// Tipos de job que la UI puede encolar (espejo de worker/handlers.py).
const TIPOS_PERMITIDOS = new Set([
  "sync_cockpit",
  "sync_recetario",
  "generar_brief",
  "activar_bot_wa",
  "parar_bot_wa",
  "toggle_bot_wa_flag",
]);

export async function encolarJob(
  tipo: string,
  payload: Record<string, unknown> = {}
): Promise<ResultadoAccion> {
  if (!TIPOS_PERMITIDOS.has(tipo)) {
    return { ok: false, error: `Tipo de job no permitido: ${tipo}` };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "No autenticada." };

  // Evita duplicar un job idéntico que aún no ha empezado.
  const { data: pendiente } = await supabase
    .from("jobs")
    .select("id")
    .eq("tipo", tipo)
    .eq("estado", "pending")
    .limit(1)
    .maybeSingle();
  if (pendiente) {
    return { ok: false, error: "Ya hay un job igual en cola." };
  }

  const { error } = await supabase
    .from("jobs")
    .insert({ tipo, payload, created_by: user.id });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/cockpit");
  return { ok: true };
}
