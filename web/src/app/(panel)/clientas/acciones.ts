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
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "Ya tienes una clienta con ese email." };
    }
    return { ok: false, error: error.message };
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

  const { error } = await supabase
    .from("clientas")
    .update({
      nombre,
      apellidos,
      email,
      telefono,
      fecha_nacimiento: fechaNacimiento,
      notas_publicas: notas,
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
