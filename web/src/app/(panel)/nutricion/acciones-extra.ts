"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ResultadoAccion = { ok: true } | { ok: false; error: string };

async function coachActual() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, coachId: null as string | null };
  const { data: coach } = await supabase
    .from("coaches")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle<{ id: string }>();
  return { supabase, coachId: coach?.id ?? null };
}

/** Activa/desactiva un plan estructurado (la clienta solo ve los activos). */
export async function alternarActivoPlan(
  planId: string,
  activo: boolean
): Promise<ResultadoAccion> {
  const { supabase, coachId } = await coachActual();
  if (!coachId) return { ok: false, error: "No autorizado." };

  const { error } = await supabase
    .from("nutricion_planes_estructurados")
    .update({ activo })
    .eq("id", planId)
    .eq("coach_id", coachId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/nutricion");
  return { ok: true };
}

const CATEGORIAS_VALIDAS = new Set(["HC", "P", "G", "V"]);

type DatosAlimento = {
  categoria: string;
  subgrupo: string;
  alimento: string;
  cantidad: string;
  notas: string;
};

function validarAlimento(d: DatosAlimento): string | null {
  if (!CATEGORIAS_VALIDAS.has(d.categoria)) return "Categoría no válida.";
  if (!d.alimento.trim()) return "Falta el nombre del alimento.";
  if (!d.cantidad.trim()) return "Falta la cantidad por ración.";
  if (d.alimento.length > 120 || d.cantidad.length > 120 || d.subgrupo.length > 80 || d.notas.length > 200) {
    return "Texto demasiado largo.";
  }
  return null;
}

export async function crearAlimento(d: DatosAlimento): Promise<ResultadoAccion> {
  const { supabase, coachId } = await coachActual();
  if (!coachId) return { ok: false, error: "No autorizado." };
  const invalido = validarAlimento(d);
  if (invalido) return { ok: false, error: invalido };

  const { error } = await supabase.from("alimentos_equivalencias").insert({
    coach_id: coachId,
    categoria: d.categoria,
    subgrupo: d.subgrupo.trim() || null,
    alimento: d.alimento.trim(),
    cantidad: d.cantidad.trim(),
    notas: d.notas.trim() || null,
    orden: 999,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/nutricion/alimentos");
  return { ok: true };
}

export async function actualizarAlimento(
  id: string,
  d: DatosAlimento
): Promise<ResultadoAccion> {
  const { supabase, coachId } = await coachActual();
  if (!coachId) return { ok: false, error: "No autorizado." };
  const invalido = validarAlimento(d);
  if (invalido) return { ok: false, error: invalido };

  const { error } = await supabase
    .from("alimentos_equivalencias")
    .update({
      subgrupo: d.subgrupo.trim() || null,
      alimento: d.alimento.trim(),
      cantidad: d.cantidad.trim(),
      notas: d.notas.trim() || null,
    })
    .eq("id", id)
    .eq("coach_id", coachId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/nutricion/alimentos");
  return { ok: true };
}

export async function eliminarAlimento(id: string): Promise<ResultadoAccion> {
  const { supabase, coachId } = await coachActual();
  if (!coachId) return { ok: false, error: "No autorizado." };

  const { error } = await supabase
    .from("alimentos_equivalencias")
    .delete()
    .eq("id", id)
    .eq("coach_id", coachId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/nutricion/alimentos");
  return { ok: true };
}

/** Publica/oculta una receta para las clientas. */
export async function alternarPublicadaReceta(
  recetaId: string,
  publicada: boolean
): Promise<ResultadoAccion> {
  const { supabase, coachId } = await coachActual();
  if (!coachId) return { ok: false, error: "No autorizado." };

  const { error } = await supabase
    .from("recetas")
    .update({ publicada, actualizado_en: new Date().toISOString() })
    .eq("id", recetaId)
    .eq("coach_id", coachId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/nutricion/recetas");
  return { ok: true };
}
