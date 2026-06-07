"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { notificarClienta } from "@/lib/push";

export type ResultadoAccion = { ok: true } | { ok: false; error: string };

// Enlace al Google Form del contrato "Peso a Paso".
const URL_CONTRATO = "https://forms.gle/AdFfX7yMc2TF6Grs9";

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

/**
 * Envía el contrato a la clienta por el chat y deja su consentimiento en
 * "pendiente" (salvo que ya esté firmado). La detección de la firma la hace el
 * webhook /api/consentimientos/firma cuando ella envía el Google Form.
 */
export async function enviarContrato(clientaId: string): Promise<ResultadoAccion> {
  const supabase = await createSupabaseServerClient();
  const coachId = await obtenerCoachId();
  if (!coachId) return { ok: false, error: "No autenticada." };

  const texto =
    "Hola 👋 Antes de empezar necesito que firmes el contrato de prestación de servicios. " +
    "Es un momento:\n" +
    URL_CONTRATO +
    "\n\nImportante: usa este mismo correo electrónico al rellenarlo, para que quede registrado automáticamente. ¡Gracias!";

  const { error: errMsg } = await supabase.from("mensajes").insert({
    coach_id: coachId,
    clienta_id: clientaId,
    remitente: "coach",
    contenido: texto,
  });
  if (errMsg) return { ok: false, error: errMsg.message };

  // Dejar el consentimiento en "pendiente" si no estaba ya firmado.
  const { data: existente } = await supabase
    .from("consentimientos")
    .select("estado")
    .eq("clienta_id", clientaId)
    .eq("tipo", "contrato_servicios")
    .maybeSingle();

  if (!existente || existente.estado !== "firmado") {
    const ahora = new Date().toISOString();
    const { error: errUp } = await supabase.from("consentimientos").upsert(
      {
        coach_id: coachId,
        clienta_id: clientaId,
        tipo: "contrato_servicios",
        estado: "pendiente",
        metodo: "google_form",
        enviado_en: ahora,
        actualizado_en: ahora,
      },
      { onConflict: "clienta_id,tipo" }
    );
    if (errUp) return { ok: false, error: errUp.message };
  }

  await notificarClienta(supabase, clientaId, {
    title: "Contrato pendiente de firma",
    body: "Tu entrenador te ha enviado el contrato de servicios.",
    url: "/c/mensajes",
  });

  revalidatePath(`/clientas/${clientaId}`);
  revalidatePath(`/mensajes/${clientaId}`);
  return { ok: true };
}

/**
 * Marca el contrato como firmado MANUALMENTE. Para casos en que la clienta lo
 * firmó por otra vía (papel, otro email que no casó con su ficha, etc.).
 */
export async function marcarContratoFirmado(
  clientaId: string
): Promise<ResultadoAccion> {
  const supabase = await createSupabaseServerClient();
  const coachId = await obtenerCoachId();
  if (!coachId) return { ok: false, error: "No autenticada." };

  const ahora = new Date().toISOString();
  const { error } = await supabase.from("consentimientos").upsert(
    {
      coach_id: coachId,
      clienta_id: clientaId,
      tipo: "contrato_servicios",
      estado: "firmado",
      metodo: "manual",
      firmado_en: ahora,
      actualizado_en: ahora,
    },
    { onConflict: "clienta_id,tipo" }
  );
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/clientas/${clientaId}`);
  return { ok: true };
}
