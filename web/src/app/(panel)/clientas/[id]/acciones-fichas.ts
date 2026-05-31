"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { TipoFicha } from "./fichas-tipos";

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

export async function guardarFicha(
  clientaId: string,
  tipo: TipoFicha,
  contenido: string
): Promise<ResultadoAccion> {
  const supabase = await createSupabaseServerClient();
  const coachId = await obtenerCoachId();
  if (!coachId) return { ok: false, error: "No autenticada." };

  const { error } = await supabase.from("fichas_clienta").upsert(
    {
      coach_id: coachId,
      clienta_id: clientaId,
      tipo,
      contenido,
    },
    { onConflict: "clienta_id,tipo" }
  );
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/clientas/${clientaId}`);
  return { ok: true };
}
