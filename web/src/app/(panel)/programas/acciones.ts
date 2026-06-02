"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  crearEstructuraVacia,
  type EstructuraPrograma,
  type Semana,
  type Dia,
  type Bloque,
} from "@/lib/supabase/tipos";
import {
  obtenerPlantilla,
  construirEstructuraDesdePlantilla,
} from "./plantillas";

export type ResultadoAccion =
  | { ok: true; id?: string }
  | { ok: false; error: string };

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

export async function crearPrograma(formData: FormData): Promise<ResultadoAccion> {
  const supabase = await createSupabaseServerClient();
  const coachId = await obtenerCoachId();
  if (!coachId) return { ok: false, error: "No autenticada." };

  const nombre = String(formData.get("nombre") ?? "").trim();
  const descripcion = String(formData.get("descripcion") ?? "").trim() || null;
  const numSemanasRaw = Number(formData.get("num_semanas") ?? 1);
  const numSemanas = Number.isFinite(numSemanasRaw) ? Math.max(1, Math.min(52, Math.floor(numSemanasRaw))) : 1;

  if (!nombre) return { ok: false, error: "El nombre es obligatorio." };

  const estructura = crearEstructuraVacia(numSemanas);

  const { data, error } = await supabase
    .from("programas")
    .insert({
      coach_id: coachId,
      nombre,
      descripcion,
      num_semanas: numSemanas,
      estructura,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };

  revalidatePath("/programas");
  return { ok: true, id: data.id };
}

export async function crearDesdePlantilla(
  plantillaId: string,
  nombrePersonalizado?: string
): Promise<ResultadoAccion> {
  const supabase = await createSupabaseServerClient();
  const coachId = await obtenerCoachId();
  if (!coachId) return { ok: false, error: "No autenticada." };

  const plantilla = obtenerPlantilla(plantillaId);
  if (!plantilla) return { ok: false, error: "Plantilla no encontrada." };

  const estructura = construirEstructuraDesdePlantilla(plantilla);

  const { data, error } = await supabase
    .from("programas")
    .insert({
      coach_id: coachId,
      nombre: nombrePersonalizado?.trim() || plantilla.nombre,
      descripcion: plantilla.resumen,
      num_semanas: plantilla.numSemanas,
      estructura,
      origen: "plantilla",
      etiquetas: plantilla.etiquetas,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };

  revalidatePath("/programas");
  return { ok: true, id: data.id };
}

export async function actualizarMetadatosPrograma(
  id: string,
  formData: FormData
): Promise<ResultadoAccion> {
  const supabase = await createSupabaseServerClient();
  const nombre = String(formData.get("nombre") ?? "").trim();
  const descripcion = String(formData.get("descripcion") ?? "").trim() || null;

  if (!nombre) return { ok: false, error: "El nombre es obligatorio." };

  const { error } = await supabase
    .from("programas")
    .update({ nombre, descripcion })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/programas");
  revalidatePath(`/programas/${id}`);
  return { ok: true, id };
}

export async function guardarEstructura(
  id: string,
  estructura: EstructuraPrograma
): Promise<ResultadoAccion> {
  const supabase = await createSupabaseServerClient();

  // Sincroniza num_semanas con la longitud real.
  const numSemanas = Math.max(1, estructura.length);

  const { error } = await supabase
    .from("programas")
    .update({ estructura, num_semanas: numSemanas })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/programas/${id}`);
  return { ok: true, id };
}

/**
 * Cuenta cuántas asignaciones activas tiene un programa.
 * Útil para preview previo a "aplicar cambios a todas".
 */
export async function contarAsignacionesActivas(
  programaId: string
): Promise<number> {
  const supabase = await createSupabaseServerClient();
  const { count } = await supabase
    .from("asignaciones")
    .select("id", { count: "exact", head: true })
    .eq("programa_id", programaId)
    .eq("activa", true);
  return count ?? 0;
}

/**
 * Propaga la estructura actual del programa a todas las asignaciones
 * activas de ese programa (sobrescribe sus estructura_snapshot).
 * Útil cuando la coach mantiene UN programa base y quiere reflejar
 * cambios en todas las clientas que lo tienen asignado.
 *
 * Si alguna asignación tenía customizaciones, se pierden. Por eso es
 * destructivo y el cliente debe pedir confirmación clara.
 */
export async function propagarEstructuraAAsignaciones(
  programaId: string
): Promise<{
  ok: boolean;
  actualizadas: number;
  error?: string;
}> {
  const supabase = await createSupabaseServerClient();

  // Cargar la estructura actual del programa
  const { data: prog, error: errProg } = await supabase
    .from("programas")
    .select("estructura")
    .eq("id", programaId)
    .maybeSingle();
  if (errProg || !prog) {
    return { ok: false, actualizadas: 0, error: "Programa no encontrado." };
  }

  const { error, count } = await supabase
    .from("asignaciones")
    .update({ estructura_snapshot: prog.estructura }, { count: "exact" })
    .eq("programa_id", programaId)
    .eq("activa", true);

  if (error) return { ok: false, actualizadas: 0, error: error.message };

  revalidatePath("/clientas");
  revalidatePath("/calendario");
  revalidatePath("/inicio");
  return { ok: true, actualizadas: count ?? 0 };
}

export async function duplicarPrograma(id: string): Promise<ResultadoAccion> {
  const supabase = await createSupabaseServerClient();
  const coachId = await obtenerCoachId();
  if (!coachId) return { ok: false, error: "No autenticada." };

  const { data: original, error: errLectura } = await supabase
    .from("programas")
    .select("nombre, descripcion, num_semanas, estructura, imagen_portada_url")
    .eq("id", id)
    .single();

  if (errLectura || !original) {
    return { ok: false, error: errLectura?.message ?? "No se encontró el programa." };
  }

  const { data, error } = await supabase
    .from("programas")
    .insert({
      coach_id: coachId,
      nombre: `${original.nombre} (copia)`,
      descripcion: original.descripcion,
      num_semanas: original.num_semanas,
      estructura: original.estructura,
      imagen_portada_url: original.imagen_portada_url,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };

  revalidatePath("/programas");
  return { ok: true, id: data.id };
}

export async function eliminarPrograma(id: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.from("programas").delete().eq("id", id);
  revalidatePath("/programas");
  redirect("/programas");
}

// ============================================================================
// Asignación: copia el programa a una clienta con un snapshot
// ============================================================================
export async function asignarPrograma(formData: FormData): Promise<ResultadoAccion> {
  const supabase = await createSupabaseServerClient();
  const coachId = await obtenerCoachId();
  if (!coachId) return { ok: false, error: "No autenticada." };

  const programaId = String(formData.get("programa_id") ?? "").trim();
  const clientaId = String(formData.get("clienta_id") ?? "").trim();
  const fechaInicio = String(formData.get("fecha_inicio") ?? "").trim();

  if (!programaId || !clientaId || !fechaInicio) {
    return { ok: false, error: "Faltan datos (programa, clienta o fecha de inicio)." };
  }

  const { data: prog, error: errProg } = await supabase
    .from("programas")
    .select("estructura, num_semanas")
    .eq("id", programaId)
    .single();

  if (errProg || !prog) {
    return { ok: false, error: errProg?.message ?? "Programa no encontrado." };
  }

  // Calcula fecha_fin como fecha_inicio + (num_semanas * 7) días.
  // Se opera en UTC para evitar un desfase de ±1 día según la zona horaria
  // del servidor (Vercel corre en UTC negativo); el resto del código
  // (calendario, historial) usa este mismo patrón.
  const fin = new Date(fechaInicio + "T00:00:00Z");
  fin.setUTCDate(fin.getUTCDate() + prog.num_semanas * 7 - 1);
  const fechaFin = fin.toISOString().slice(0, 10);

  // Reemplazar: una clienta = un programa activo. Desactiva cualquier
  // asignación activa previa de esta clienta antes de crear la nueva.
  const { error: errDesactivar } = await supabase
    .from("asignaciones")
    .update({ activa: false })
    .eq("clienta_id", clientaId)
    .eq("coach_id", coachId)
    .eq("activa", true);

  if (errDesactivar) return { ok: false, error: errDesactivar.message };

  const { error } = await supabase.from("asignaciones").insert({
    coach_id: coachId,
    clienta_id: clientaId,
    programa_id: programaId,
    fecha_inicio: fechaInicio,
    fecha_fin: fechaFin,
    estructura_snapshot: prog.estructura,
    activa: true,
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/clientas/${clientaId}`);
  revalidatePath(`/programas/${programaId}`);
  return { ok: true };
}

// ============================================================================
// Helpers para mutaciones puntuales sobre la estructura (todas server-side)
// ============================================================================

export async function agregarBloque(
  programaId: string,
  semanaIdx: number,
  diaIdx: number,
  titulo: string
): Promise<ResultadoAccion> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("programas")
    .select("estructura")
    .eq("id", programaId)
    .single();
  if (error || !data) return { ok: false, error: error?.message ?? "No encontrado." };

  const estructura = data.estructura as EstructuraPrograma;
  const bloque: Bloque = {
    id: crypto.randomUUID(),
    titulo: titulo.trim() || "Bloque",
    elementos: [],
  };
  estructura[semanaIdx]?.dias[diaIdx]?.bloques.push(bloque);

  return guardarEstructura(programaId, estructura);
}

export async function agregarSemana(programaId: string): Promise<ResultadoAccion> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("programas")
    .select("estructura")
    .eq("id", programaId)
    .single();
  if (error || !data) return { ok: false, error: error?.message ?? "No encontrado." };

  const estructura = data.estructura as EstructuraPrograma;
  const num = estructura.length + 1;
  const nueva: Semana = {
    semana: num,
    dias: [
      "Lunes",
      "Martes",
      "Miércoles",
      "Jueves",
      "Viernes",
      "Sábado",
      "Domingo",
    ].map((nombre, j) => ({
      dia: j + 1,
      titulo: nombre,
      descanso: j >= 5,
      bloques: [],
    })) as Dia[],
  };
  estructura.push(nueva);

  return guardarEstructura(programaId, estructura);
}

export async function duplicarSemana(
  programaId: string,
  semanaIdx: number
): Promise<ResultadoAccion> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("programas")
    .select("estructura")
    .eq("id", programaId)
    .single();
  if (error || !data) return { ok: false, error: error?.message ?? "No encontrado." };

  const estructura = data.estructura as EstructuraPrograma;
  const original = estructura[semanaIdx];
  if (!original) return { ok: false, error: "Semana no encontrada." };

  const copia: Semana = JSON.parse(JSON.stringify(original));
  copia.semana = estructura.length + 1;
  // Regenerar ids para evitar duplicados
  copia.dias.forEach((d) => {
    d.bloques.forEach((b) => {
      b.id = crypto.randomUUID();
      b.elementos.forEach((e) => (e.id = crypto.randomUUID()));
    });
  });
  estructura.push(copia);

  return guardarEstructura(programaId, estructura);
}

export async function eliminarSemana(
  programaId: string,
  semanaIdx: number
): Promise<ResultadoAccion> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("programas")
    .select("estructura")
    .eq("id", programaId)
    .single();
  if (error || !data) return { ok: false, error: error?.message ?? "No encontrado." };

  const estructura = data.estructura as EstructuraPrograma;
  if (estructura.length <= 1) {
    return { ok: false, error: "El programa debe tener al menos una semana." };
  }
  estructura.splice(semanaIdx, 1);
  // Renumera
  estructura.forEach((s, i) => (s.semana = i + 1));

  return guardarEstructura(programaId, estructura);
}
