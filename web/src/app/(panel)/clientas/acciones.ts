"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ResultadoAccion =
  | { ok: true; id?: string }
  | { ok: false; error: string };

function validarEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validarTelefono(tel: string): boolean {
  // Dígitos, espacios y los símbolos habituales (+ - ( )), entre 6 y 20 chars.
  return /^[+0-9()\s-]{6,20}$/.test(tel);
}

function fechaISOValida(iso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const d = new Date(iso + "T00:00:00Z");
  // Rechaza fechas imposibles (p. ej. 2026-02-31 que "rueda" a marzo).
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === iso;
}

const ETAPAS = ["lead", "activa", "pausada", "baja", "recuperable"] as const;

/**
 * Lee y valida los campos comerciales (CRM Fase 1) del formulario de clienta.
 * Devuelve un objeto listo para spread en el insert/update, o un error.
 */
function leerCamposComerciales(
  formData: FormData
):
  | { ok: true; campos: Record<string, unknown> }
  | { ok: false; error: string } {
  const texto = (k: string) => String(formData.get(k) ?? "").trim() || null;

  const etapaRaw = String(formData.get("etapa") ?? "").trim();
  const etapa = etapaRaw === "" ? null : etapaRaw;
  if (etapa && !ETAPAS.includes(etapa as (typeof ETAPAS)[number])) {
    return { ok: false, error: "Etapa de funnel no válida." };
  }

  const whatsapp = texto("whatsapp_phone");
  if (whatsapp && !validarTelefono(whatsapp)) {
    return { ok: false, error: "El WhatsApp no es válido." };
  }

  return {
    ok: true,
    campos: {
      etapa,
      lead_source: texto("lead_source"),
      whatsapp_phone: whatsapp,
      es_avatar_objetivo: formData.get("es_avatar_objetivo") === "on",
      objetivo_principal: texto("objetivo_principal"),
      ciudad: texto("ciudad"),
      condiciones_medicas: texto("condiciones_medicas"),
      lesiones_limitaciones: texto("lesiones_limitaciones"),
      material: texto("material"),
      notas_contexto: texto("notas_contexto"),
    },
  };
}

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

export async function crearClienta(formData: FormData): Promise<ResultadoAccion> {
  const supabase = await createSupabaseServerClient();
  const coachId = await obtenerCoachId();
  if (!coachId) return { ok: false, error: "No autenticada." };

  const nombre = String(formData.get("nombre") ?? "").trim();
  const apellidos = String(formData.get("apellidos") ?? "").trim() || null;
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const telefono = String(formData.get("telefono") ?? "").trim() || null;

  if (!nombre) return { ok: false, error: "El nombre es obligatorio." };
  if (!validarEmail(email)) return { ok: false, error: "El email no es válido." };
  if (telefono && !validarTelefono(telefono))
    return { ok: false, error: "El teléfono no es válido." };

  const comercial = leerCamposComerciales(formData);
  if (!comercial.ok) return comercial;

  const { data, error } = await supabase
    .from("clientas")
    .insert({
      coach_id: coachId,
      nombre,
      apellidos,
      email,
      telefono,
      estado: "invitada",
      invitada_en: new Date().toISOString(),
      ...comercial.campos,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "Ya tienes una clienta con ese email." };
    }
    return { ok: false, error: error.message };
  }

  // Auto-asignar el formulario de onboarding del coach (si lo tiene marcado).
  const { data: onboarding } = await supabase
    .from("formularios")
    .select("id")
    .eq("coach_id", coachId)
    .eq("es_onboarding", true)
    .maybeSingle<{ id: string }>();
  if (onboarding) {
    await supabase.from("formulario_asignaciones").insert({
      formulario_id: onboarding.id,
      coach_id: coachId,
      clienta_id: data.id,
    });
  }

  revalidatePath("/clientas");
  return { ok: true, id: data.id };
}

export async function actualizarClienta(
  id: string,
  formData: FormData
): Promise<ResultadoAccion> {
  const supabase = await createSupabaseServerClient();
  const coachId = await obtenerCoachId();
  if (!coachId) return { ok: false, error: "No autenticada." };

  const nombre = String(formData.get("nombre") ?? "").trim();
  const apellidos = String(formData.get("apellidos") ?? "").trim() || null;
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const telefono = String(formData.get("telefono") ?? "").trim() || null;
  const fechaNacimiento = String(formData.get("fecha_nacimiento") ?? "").trim() || null;
  const notas = String(formData.get("notas_publicas") ?? "").trim() || null;

  if (!nombre) return { ok: false, error: "El nombre es obligatorio." };
  if (!validarEmail(email)) return { ok: false, error: "El email no es válido." };
  if (telefono && !validarTelefono(telefono))
    return { ok: false, error: "El teléfono no es válido." };
  if (
    fechaNacimiento &&
    (!fechaISOValida(fechaNacimiento) ||
      new Date(fechaNacimiento + "T00:00:00Z") > new Date())
  )
    return { ok: false, error: "La fecha de nacimiento no es válida." };

  const comercial = leerCamposComerciales(formData);
  if (!comercial.ok) return comercial;

  const { error } = await supabase
    .from("clientas")
    .update({
      nombre,
      apellidos,
      email,
      telefono,
      fecha_nacimiento: fechaNacimiento,
      notas_publicas: notas,
      ...comercial.campos,
    })
    .eq("id", id)
    .eq("coach_id", coachId);

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "Ya tienes una clienta con ese email." };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath("/clientas");
  revalidatePath(`/clientas/${id}`);
  return { ok: true, id };
}

export async function cambiarEstadoClienta(
  id: string,
  estado: "activa" | "archivada" | "invitada"
): Promise<ResultadoAccion> {
  const supabase = await createSupabaseServerClient();
  const coachId = await obtenerCoachId();
  if (!coachId) return { ok: false, error: "No autenticada." };

  // Gate RGPD: no se puede activar a una clienta sin contrato firmado.
  if (estado === "activa") {
    const { data: firma } = await supabase
      .from("consentimientos")
      .select("id")
      .eq("clienta_id", id)
      .eq("tipo", "contrato_servicios")
      .eq("estado", "firmado")
      .maybeSingle();
    if (!firma) {
      return {
        ok: false,
        error:
          "No puedes activar a la clienta hasta que firme el contrato. Envíaselo desde su ficha (o márcalo firmado a mano si ya lo firmó por otra vía).",
      };
    }
  }

  const { error } = await supabase
    .from("clientas")
    .update({ estado })
    .eq("id", id)
    .eq("coach_id", coachId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/clientas");
  revalidatePath(`/clientas/${id}`);
  return { ok: true };
}

export async function eliminarClienta(id: string): Promise<ResultadoAccion> {
  const supabase = await createSupabaseServerClient();
  const coachId = await obtenerCoachId();
  if (!coachId) return { ok: false, error: "No autenticada." };

  const { error } = await supabase
    .from("clientas")
    .delete()
    .eq("id", id)
    .eq("coach_id", coachId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/clientas");
  redirect("/clientas");
}
