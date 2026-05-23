"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ResultadoAccion = { ok: true; id?: string } | { ok: false; error: string };

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

export async function crearPlanNutricion(
  formData: FormData
): Promise<ResultadoAccion> {
  const supabase = await createSupabaseServerClient();
  const coachId = await obtenerCoachId();
  if (!coachId) return { ok: false, error: "No autenticada." };

  const nombre = String(formData.get("nombre") ?? "").trim();
  const descripcion = String(formData.get("descripcion") ?? "").trim() || null;
  const pdfUrl = String(formData.get("pdf_url") ?? "").trim() || null;
  const contenidoMarkdown =
    String(formData.get("contenido_markdown") ?? "").trim() || null;
  const clientaId = String(formData.get("clienta_id") ?? "").trim() || null;

  if (!nombre) return { ok: false, error: "El nombre es obligatorio." };

  const { data, error } = await supabase
    .from("nutricion_planes")
    .insert({
      coach_id: coachId,
      clienta_id: clientaId,
      nombre,
      descripcion,
      pdf_url: pdfUrl,
      contenido_markdown: contenidoMarkdown,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };

  revalidatePath("/nutricion");
  if (clientaId) revalidatePath(`/clientas/${clientaId}`);
  return { ok: true, id: data.id };
}

export async function eliminarPlanNutricion(id: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.from("nutricion_planes").delete().eq("id", id);
  revalidatePath("/nutricion");
  redirect("/nutricion");
}

// ----- Listas de la compra -----

type ItemCompra = {
  id: string;
  nombre: string;
  cantidad?: string;
  categoria?: string;
  comprado: boolean;
};

export async function crearListaCompra(
  formData: FormData
): Promise<ResultadoAccion> {
  const supabase = await createSupabaseServerClient();
  const coachId = await obtenerCoachId();
  if (!coachId) return { ok: false, error: "No autenticada." };

  const clientaId = String(formData.get("clienta_id") ?? "").trim();
  const nombre = String(formData.get("nombre") ?? "").trim();
  const itemsRaw = String(formData.get("items") ?? "").trim();

  if (!clientaId) return { ok: false, error: "Falta la clienta." };
  if (!nombre) return { ok: false, error: "Falta el nombre de la lista." };

  // Parsea items: una línea por item, formato libre. "200 g pollo" → {nombre:'200 g pollo'}
  const items: ItemCompra[] = itemsRaw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((linea) => ({
      id: crypto.randomUUID(),
      nombre: linea,
      comprado: false,
    }));

  const { data, error } = await supabase
    .from("listas_compra")
    .insert({
      coach_id: coachId,
      clienta_id: clientaId,
      nombre,
      items,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };

  revalidatePath("/nutricion");
  revalidatePath(`/clientas/${clientaId}`);
  return { ok: true, id: data.id };
}

export async function eliminarListaCompra(id: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.from("listas_compra").delete().eq("id", id);
  revalidatePath("/nutricion");
  redirect("/nutricion");
}
