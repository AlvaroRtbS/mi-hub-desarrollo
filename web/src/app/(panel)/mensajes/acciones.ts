"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ResultadoAccion = { ok: true } | { ok: false; error: string };

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

export async function enviarMensaje(
  clientaId: string,
  contenido: string
): Promise<ResultadoAccion> {
  const supabase = await createSupabaseServerClient();
  const coachId = await obtenerCoachId();
  if (!coachId) return { ok: false, error: "No autenticada." };

  const texto = contenido.trim();
  if (!texto) return { ok: false, error: "El mensaje está vacío." };

  const { error } = await supabase.from("mensajes").insert({
    coach_id: coachId,
    clienta_id: clientaId,
    remitente: "coach",
    contenido: texto,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/mensajes");
  revalidatePath(`/mensajes/${clientaId}`);
  return { ok: true };
}

export async function marcarConversacionLeida(clientaId: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase
    .from("mensajes")
    .update({ leido: true })
    .eq("clienta_id", clientaId)
    .eq("remitente", "clienta")
    .eq("leido", false);
  revalidatePath("/mensajes");
  revalidatePath(`/mensajes/${clientaId}`);
}

// Útil para pruebas y para simular cuando llegue WhatsApp:
// simula un mensaje entrante de la clienta.
export async function simularMensajeClienta(
  clientaId: string,
  contenido: string
): Promise<ResultadoAccion> {
  const supabase = await createSupabaseServerClient();
  const coachId = await obtenerCoachId();
  if (!coachId) return { ok: false, error: "No autenticada." };

  const texto = contenido.trim();
  if (!texto) return { ok: false, error: "Vacío." };

  const { error } = await supabase.from("mensajes").insert({
    coach_id: coachId,
    clienta_id: clientaId,
    remitente: "clienta",
    contenido: texto,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/mensajes");
  revalidatePath(`/mensajes/${clientaId}`);
  return { ok: true };
}
