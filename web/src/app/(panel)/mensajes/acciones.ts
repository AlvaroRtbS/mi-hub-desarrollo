"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { notificarClienta } from "@/lib/push";

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

  await notificarClienta(supabase, clientaId, {
    title: "Nuevo mensaje de tu entrenador",
    body: texto.slice(0, 90),
    url: "/c/mensajes",
  });

  revalidatePath("/mensajes");
  revalidatePath(`/mensajes/${clientaId}`);
  return { ok: true };
}

export async function enviarMensajeABroadcast(
  clientaIds: string[],
  contenido: string
): Promise<{
  ok: boolean;
  enviados: number;
  fallidos: number;
  error?: string;
}> {
  const supabase = await createSupabaseServerClient();
  const coachId = await obtenerCoachId();
  if (!coachId) {
    return { ok: false, enviados: 0, fallidos: 0, error: "No autenticada." };
  }

  const texto = contenido.trim();
  if (!texto) {
    return { ok: false, enviados: 0, fallidos: 0, error: "El mensaje está vacío." };
  }
  if (clientaIds.length === 0) {
    return { ok: false, enviados: 0, fallidos: 0, error: "Selecciona al menos una clienta." };
  }

  // Verificar que todas las clientas pertenecen a este coach (defensivo, además del RLS)
  const { data: misClientas } = await supabase
    .from("clientas")
    .select("id")
    .eq("coach_id", coachId)
    .in("id", clientaIds);
  const idsValidos = new Set(((misClientas ?? []) as Array<{ id: string }>).map((c) => c.id));
  const idsFinales = clientaIds.filter((id) => idsValidos.has(id));
  if (idsFinales.length === 0) {
    return { ok: false, enviados: 0, fallidos: clientaIds.length, error: "Ninguna clienta válida." };
  }

  const filas = idsFinales.map((cid) => ({
    coach_id: coachId,
    clienta_id: cid,
    remitente: "coach" as const,
    contenido: texto,
  }));

  const { error, count } = await supabase
    .from("mensajes")
    .insert(filas, { count: "exact" });

  if (error) {
    return {
      ok: false,
      enviados: 0,
      fallidos: idsFinales.length,
      error: error.message,
    };
  }

  await Promise.all(
    idsFinales.map((cid) =>
      notificarClienta(supabase, cid, {
        title: "Nuevo mensaje de tu entrenador",
        body: texto.slice(0, 90),
        url: "/c/mensajes",
      })
    )
  );

  revalidatePath("/mensajes");
  return {
    ok: true,
    enviados: count ?? idsFinales.length,
    fallidos: clientaIds.length - idsFinales.length,
  };
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
