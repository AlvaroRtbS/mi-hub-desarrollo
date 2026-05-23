"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ResultadoAccion = { ok: true } | { ok: false; error: string };

export const TIPOS_FICHA = [
  { id: "anamnesis", label: "Anamnesis", emoji: "🧬" },
  { id: "lesiones", label: "Lesiones / limitaciones", emoji: "🩹" },
  {
    id: "preferencias_alimentarias",
    label: "Preferencias alimentarias",
    emoji: "🥗",
  },
  { id: "historial_deportivo", label: "Historial deportivo", emoji: "🏃" },
  { id: "disponibilidad", label: "Disponibilidad", emoji: "📅" },
] as const;

export type TipoFicha = (typeof TIPOS_FICHA)[number]["id"];

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
