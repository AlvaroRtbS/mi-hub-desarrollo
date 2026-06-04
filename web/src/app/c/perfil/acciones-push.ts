"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ResultadoAccion = { ok: true } | { ok: false; error: string };

type Suscripcion = { endpoint: string; p256dh: string; auth: string };

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

/** Guarda (o actualiza) la suscripción push del navegador de la clienta. */
export async function guardarSuscripcionPush(
  sub: Suscripcion
): Promise<ResultadoAccion> {
  const { supabase, clientaId } = await clientaActual();
  if (!clientaId) return { ok: false, error: "No autorizado." };
  if (!sub?.endpoint || !sub?.p256dh || !sub?.auth) {
    return { ok: false, error: "Suscripción inválida." };
  }

  const { error } = await supabase.from("push_suscripciones").upsert(
    {
      clienta_id: clientaId,
      endpoint: sub.endpoint,
      p256dh: sub.p256dh,
      auth: sub.auth,
    },
    { onConflict: "endpoint" }
  );

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Elimina la suscripción (cuando la clienta desactiva las notificaciones). */
export async function borrarSuscripcionPush(
  endpoint: string
): Promise<ResultadoAccion> {
  const { supabase, clientaId } = await clientaActual();
  if (!clientaId) return { ok: false, error: "No autorizado." };

  const { error } = await supabase
    .from("push_suscripciones")
    .delete()
    .eq("endpoint", endpoint)
    .eq("clienta_id", clientaId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
