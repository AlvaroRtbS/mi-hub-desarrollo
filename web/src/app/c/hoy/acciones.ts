"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function marcarSesionCompletada(
  clientaId: string,
  fecha: string,
  semana: number,
  dia: number,
  sesionId: string | null
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "No autenticada." };

  // Necesitamos el coach_id de la asignación para poder insertar
  const { data: asign } = await supabase
    .from("asignaciones")
    .select("coach_id")
    .eq("clienta_id", clientaId)
    .eq("activa", true)
    .order("creada_en", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!asign) return { ok: false, error: "No hay asignación activa." };

  if (sesionId) {
    const { error } = await supabase
      .from("sesiones")
      .update({ completada: true, porcentaje_completado: 100 })
      .eq("id", sesionId);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await supabase.from("sesiones").insert({
      coach_id: asign.coach_id,
      clienta_id: clientaId,
      fecha,
      semana,
      dia,
      completada: true,
      porcentaje_completado: 100,
    });
    if (error) return { ok: false, error: error.message };
  }

  // Disparar recálculo de logros — no esperamos a la respuesta
  // (fetch desde el server al propio endpoint con auth cookie)
  // Simplificado: lo hacemos en la siguiente carga; el cron diario también lo recalcula.

  revalidatePath("/c/hoy");
  revalidatePath("/c/programa");
  return { ok: true };
}
