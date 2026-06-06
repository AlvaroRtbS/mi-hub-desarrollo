"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Toma } from "@/lib/nutricion";
import { ALIMENTOS_POR_DEFECTO } from "@/lib/nutricion-equivalencias-default";
import { generarMenuPlan, type AlimentoGen } from "@/lib/generar-menu";
import { restriccionesATexto, type DietaRestricciones } from "@/lib/dieta";

export type ResultadoAccion = { ok: true } | { ok: false; error: string };
export type ResultadoCrear = { ok: true; id: string } | { ok: false; error: string };

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

/** Siembra la tabla de alimentos por defecto si el coach aún no tiene ninguno. */
export async function cargarTablaAlimentosPorDefecto(): Promise<ResultadoAccion> {
  const { supabase, coachId } = await coachActual();
  if (!coachId) return { ok: false, error: "No autorizado." };

  const { count } = await supabase
    .from("alimentos_equivalencias")
    .select("id", { count: "exact", head: true })
    .eq("coach_id", coachId);

  if ((count ?? 0) > 0) {
    return { ok: false, error: "Ya tienes una tabla de alimentos cargada." };
  }

  const filas = ALIMENTOS_POR_DEFECTO.map((a, i) => ({
    coach_id: coachId,
    categoria: a.categoria,
    subgrupo: a.subgrupo,
    alimento: a.alimento,
    cantidad: a.cantidad,
    notas: a.notas ?? null,
    orden: i,
  }));

  const { error } = await supabase.from("alimentos_equivalencias").insert(filas);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/nutricion/alimentos");
  return { ok: true };
}

type DatosPlan = {
  nombre: string;
  clientaId: string | null;
  calorias: number | null;
  proteina_g: number | null;
  grasa_g: number | null;
  hc_g: number | null;
  raciones_hc: number | null;
  raciones_p: number | null;
  raciones_g: number | null;
  tomas: Toma[];
  notas: string | null;
};

export async function crearPlanEstructurado(datos: DatosPlan): Promise<ResultadoCrear> {
  const { supabase, coachId } = await coachActual();
  if (!coachId) return { ok: false, error: "No autorizado." };
  if (!datos.nombre.trim()) return { ok: false, error: "El plan necesita un nombre." };

  const { data, error } = await supabase
    .from("nutricion_planes_estructurados")
    .insert({
      coach_id: coachId,
      clienta_id: datos.clientaId,
      nombre: datos.nombre.trim(),
      calorias: datos.calorias,
      proteina_g: datos.proteina_g,
      grasa_g: datos.grasa_g,
      hc_g: datos.hc_g,
      raciones_hc: datos.raciones_hc,
      raciones_p: datos.raciones_p,
      raciones_g: datos.raciones_g,
      tomas: datos.tomas,
      notas: datos.notas,
    })
    .select("id")
    .single<{ id: string }>();

  if (error) return { ok: false, error: error.message };
  revalidatePath("/nutricion");
  return { ok: true, id: data.id };
}

export async function actualizarPlanEstructurado(
  id: string,
  datos: DatosPlan
): Promise<ResultadoAccion> {
  const { supabase, coachId } = await coachActual();
  if (!coachId) return { ok: false, error: "No autorizado." };
  if (!datos.nombre.trim()) return { ok: false, error: "El plan necesita un nombre." };

  const { error } = await supabase
    .from("nutricion_planes_estructurados")
    .update({
      clienta_id: datos.clientaId,
      nombre: datos.nombre.trim(),
      calorias: datos.calorias,
      proteina_g: datos.proteina_g,
      grasa_g: datos.grasa_g,
      hc_g: datos.hc_g,
      raciones_hc: datos.raciones_hc,
      raciones_p: datos.raciones_p,
      raciones_g: datos.raciones_g,
      tomas: datos.tomas,
      notas: datos.notas,
      actualizado_en: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/nutricion");
  revalidatePath(`/nutricion/equivalencias/${id}`);
  return { ok: true };
}

export type ResultadoMenu =
  | { ok: true; tomas: { id: string; menu: string[] }[] }
  | { ok: false; error: string };

/**
 * Genera un menú sugerido por toma (determinista, sin IA): cuadra las raciones
 * con la tabla de alimentos del coach respetando las intolerancias de la clienta
 * (de su Formulario Inicial). 0 € y sin enviar datos a terceros.
 */
export async function sugerirMenuLocal(
  tomas: Toma[],
  clientaId: string | null,
  notas: string | null
): Promise<ResultadoMenu> {
  const { supabase, coachId } = await coachActual();
  if (!coachId) return { ok: false, error: "No autorizado." };
  if (!tomas || tomas.length === 0) {
    return { ok: false, error: "Calcula primero el reparto por tomas." };
  }

  const { data: alimentos } = await supabase
    .from("alimentos_equivalencias")
    .select("categoria, subgrupo, alimento, cantidad, notas")
    .eq("coach_id", coachId)
    .order("orden", { ascending: true })
    .returns<AlimentoGen[]>();

  if (!alimentos || alimentos.length === 0) {
    return {
      ok: false,
      error: "Carga primero la tabla de alimentos (Nutrición → Tabla de alimentos).",
    };
  }

  // Restricciones de la clienta (si la hay): perfil dietético (checks + nota
  // libre) + Formulario Inicial.
  let intolerancias = "";
  let perfilDieta = "";
  if (clientaId) {
    const { data: fr } = await supabase
      .from("formulario_respuestas")
      .select("respuestas")
      .eq("clienta_id", clientaId)
      .eq("tipo", "inicial")
      .maybeSingle<{ respuestas: Record<string, string> }>();
    const r = fr?.respuestas ?? {};
    intolerancias = [r.alimentacion, r.algo_mas].filter(Boolean).join(". ");

    const { data: cl } = await supabase
      .from("clientas")
      .select("dieta_restricciones")
      .eq("id", clientaId)
      .maybeSingle<{ dieta_restricciones: DietaRestricciones }>();
    perfilDieta = restriccionesATexto(cl?.dieta_restricciones);
  }

  // Combina perfil dietético + formulario + notas del plan como restricciones.
  const textoRestricciones = [perfilDieta, intolerancias, notas]
    .filter(Boolean)
    .join(". ");

  return { ok: true, tomas: generarMenuPlan(tomas, alimentos, textoRestricciones) };
}

type ItemCompra = { id: string; nombre: string; cantidad?: string; comprado: boolean };

/** Parte una línea de menú en {nombre, cantidad}. Soporta "Alimento: 150 g" y "150 g de alimento". */
function parsearLineaMenu(linea: string): { nombre: string; cantidad: string } {
  const l = linea.trim();
  // Verdura libre → ingrediente genérico
  if (/verdura/i.test(l)) return { nombre: "Verdura variada", cantidad: "" };
  // Formato "Alimento: cantidad"
  const conDosPuntos = l.match(/^(.+?):\s*(.+)$/);
  if (conDosPuntos) return { nombre: conDosPuntos[1].trim(), cantidad: conDosPuntos[2].trim() };
  // Formato "150 g de alimento" / "150 g alimento"
  const conNumero = l.match(/^([\d.,]+\s*(?:g|ml|uds?|unidad(?:es)?|cda)?)\s*(?:de\s+)?(.+)$/i);
  if (conNumero) return { nombre: conNumero[2].trim(), cantidad: conNumero[1].trim() };
  return { nombre: l, cantidad: "" };
}

/** Genera una lista de la compra (tabla listas_compra) a partir del menú del plan. */
export async function generarListaDesdeMenu(
  tomas: Toma[],
  clientaId: string | null,
  nombrePlan: string
): Promise<ResultadoCrear> {
  const { supabase, coachId } = await coachActual();
  if (!coachId) return { ok: false, error: "No autorizado." };
  if (!clientaId) return { ok: false, error: "Asigna el plan a una clienta primero." };

  // Reúne todas las líneas de menú y agrega por ingrediente (junta cantidades).
  const porNombre = new Map<string, string[]>();
  for (const t of tomas) {
    for (const linea of t.menu ?? []) {
      if (!linea.trim()) continue;
      const { nombre, cantidad } = parsearLineaMenu(linea);
      const clave = nombre.toLowerCase();
      const lista = porNombre.get(clave) ?? [];
      if (cantidad) lista.push(cantidad);
      porNombre.set(clave, lista);
      // Guardamos el nombre con su capitalización original la primera vez
      if (!porNombre.has(clave + "__label")) {
        porNombre.set(clave + "__label", [nombre]);
      }
    }
  }

  const items: ItemCompra[] = [];
  for (const [clave, cantidades] of porNombre) {
    if (clave.endsWith("__label")) continue;
    const label = porNombre.get(clave + "__label")?.[0] ?? clave;
    items.push({
      id: crypto.randomUUID(),
      nombre: label,
      cantidad: cantidades.length ? cantidades.join(" + ") : undefined,
      comprado: false,
    });
  }

  if (items.length === 0) {
    return { ok: false, error: "El plan no tiene menú. Genera el menú primero." };
  }

  const { data, error } = await supabase
    .from("listas_compra")
    .insert({
      coach_id: coachId,
      clienta_id: clientaId,
      nombre: `Compra · ${nombrePlan}`.slice(0, 120),
      items,
    })
    .select("id")
    .single<{ id: string }>();

  if (error) return { ok: false, error: error.message };
  revalidatePath("/nutricion");
  revalidatePath(`/clientas/${clientaId}`);
  return { ok: true, id: data.id };
}

export async function eliminarPlanEstructurado(id: string): Promise<ResultadoAccion> {
  const { supabase, coachId } = await coachActual();
  if (!coachId) return { ok: false, error: "No autorizado." };

  const { error } = await supabase
    .from("nutricion_planes_estructurados")
    .delete()
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/nutricion");
  return { ok: true };
}
