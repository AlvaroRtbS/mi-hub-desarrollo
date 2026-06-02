"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ResultadoAccion =
  | { ok: true; id?: string }
  | { ok: false; error: string };

type DatosEjercicio = {
  nombre: string;
  descripcion: string | null;
  instrucciones: string | null;
  video_url: string | null;
  imagen_url: string | null;
  grupos_musculares: string[];
  material: string[];
};

function parsearLista(formData: FormData, campo: string): string[] {
  return formData.getAll(campo).map((v) => String(v)).filter(Boolean);
}

function parsearFormulario(formData: FormData): DatosEjercicio | { error: string } {
  const nombre = String(formData.get("nombre") ?? "").trim();
  if (!nombre) return { error: "El nombre es obligatorio." };

  return {
    nombre,
    descripcion: String(formData.get("descripcion") ?? "").trim() || null,
    instrucciones: String(formData.get("instrucciones") ?? "").trim() || null,
    video_url: String(formData.get("video_url") ?? "").trim() || null,
    imagen_url: String(formData.get("imagen_url") ?? "").trim() || null,
    grupos_musculares: parsearLista(formData, "grupos_musculares"),
    material: parsearLista(formData, "material"),
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

export async function crearEjercicio(formData: FormData): Promise<ResultadoAccion> {
  const datos = parsearFormulario(formData);
  if ("error" in datos) return { ok: false, error: datos.error };

  const supabase = await createSupabaseServerClient();
  const coachId = await obtenerCoachId();
  if (!coachId) return { ok: false, error: "No autenticada." };

  const { data, error } = await supabase
    .from("ejercicios")
    .insert({ ...datos, coach_id: coachId })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };

  revalidatePath("/ejercicios");
  return { ok: true, id: data.id };
}

export async function actualizarEjercicio(
  id: string,
  formData: FormData
): Promise<ResultadoAccion> {
  const datos = parsearFormulario(formData);
  if ("error" in datos) return { ok: false, error: datos.error };

  const supabase = await createSupabaseServerClient();
  const coachId = await obtenerCoachId();
  if (!coachId) return { ok: false, error: "No autenticada." };

  const { error } = await supabase
    .from("ejercicios")
    .update(datos)
    .eq("id", id)
    .eq("coach_id", coachId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/ejercicios");
  revalidatePath(`/ejercicios/${id}`);
  return { ok: true, id };
}

export async function eliminarEjercicio(id: string): Promise<ResultadoAccion> {
  const supabase = await createSupabaseServerClient();
  const coachId = await obtenerCoachId();
  if (!coachId) return { ok: false, error: "No autenticada." };

  const { error } = await supabase
    .from("ejercicios")
    .delete()
    .eq("id", id)
    .eq("coach_id", coachId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/ejercicios");
  redirect("/ejercicios");
}
