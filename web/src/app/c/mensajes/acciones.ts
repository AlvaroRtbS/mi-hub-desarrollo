"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ResultadoAccion = { ok: true } | { ok: false; error: string };

export async function marcarMisMensajesLeidos(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: clienta } = await supabase
    .from("clientas")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!clienta) return;

  await supabase
    .from("mensajes")
    .update({ leido: true })
    .eq("clienta_id", clienta.id)
    .eq("remitente", "coach")
    .eq("leido", false);

  // Refresca el badge de "Chat" del layout de clienta.
  revalidatePath("/c/mensajes", "layout");
}

export async function enviarMiMensaje(
  contenido: string
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

  const texto = contenido.trim();
  if (!texto) return { ok: false, error: "El mensaje está vacío." };

  const { error } = await supabase.from("mensajes").insert({
    coach_id: clienta.coach_id,
    clienta_id: clienta.id,
    remitente: "clienta",
    contenido: texto,
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/c/mensajes");
  return { ok: true };
}
