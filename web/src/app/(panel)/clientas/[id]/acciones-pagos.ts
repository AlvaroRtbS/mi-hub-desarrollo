"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { EstadoPago, OrigenPago, TipoPago } from "@/lib/supabase/tipos";

export type ResultadoAccion =
  | { ok: true; id?: string }
  | { ok: false; error: string };

async function obtenerCoachId(): Promise<{
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  coachId: string | null;
}> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, coachId: null };
  const { data } = await supabase
    .from("coaches")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle<{ id: string }>();
  return { supabase, coachId: data?.id ?? null };
}

function fechaValida(iso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const d = new Date(iso + "T00:00:00Z");
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === iso;
}

function sumarMeses(iso: string, meses: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCMonth(d.getUTCMonth() + meses);
  return d.toISOString().slice(0, 10);
}

const ORIGENES: OrigenPago[] = [
  "stripe",
  "sepa",
  "bizum",
  "transferencia",
  "efectivo",
  "otro",
];

/**
 * Crea una inscripción para la clienta. Si `generarCuotas` está activo, genera
 * automáticamente `cuotasTotal` pagos pendientes (mensuales desde fechaInicio),
 * repartiendo el importe a partes iguales.
 */
export async function crearInscripcion(input: {
  clientaId: string;
  concepto: string;
  fechaInicio: string;
  importeTotal: number;
  tipoPago: TipoPago;
  cuotasTotal: number;
  renovacionFecha: string | null;
  generarCuotas: boolean;
  origenCuotas: OrigenPago | null;
}): Promise<ResultadoAccion> {
  const { supabase, coachId } = await obtenerCoachId();
  if (!coachId) return { ok: false, error: "No autenticada." };

  // La clienta debe pertenecer a este coach (defensa en profundidad sobre RLS).
  const { data: clienta } = await supabase
    .from("clientas")
    .select("id")
    .eq("id", input.clientaId)
    .eq("coach_id", coachId)
    .maybeSingle<{ id: string }>();
  if (!clienta) return { ok: false, error: "Clienta no encontrada." };

  if (!fechaValida(input.fechaInicio))
    return { ok: false, error: "Fecha de inicio no válida." };
  if (input.renovacionFecha && !fechaValida(input.renovacionFecha))
    return { ok: false, error: "Fecha de renovación no válida." };
  if (!Number.isFinite(input.importeTotal) || input.importeTotal <= 0)
    return { ok: false, error: "El importe debe ser mayor que 0." };
  const cuotas = Math.max(1, Math.round(input.cuotasTotal));
  if (input.tipoPago === "fraccionado" && cuotas < 2)
    return { ok: false, error: "Un pago fraccionado necesita 2+ cuotas." };
  if (input.origenCuotas && !ORIGENES.includes(input.origenCuotas))
    return { ok: false, error: "Origen de pago no válido." };

  const { data: insc, error } = await supabase
    .from("inscripciones")
    .insert({
      coach_id: coachId,
      clienta_id: input.clientaId,
      concepto: input.concepto.trim() || "Programa 1-a-1",
      fecha_inicio: input.fechaInicio,
      importe_total: input.importeTotal,
      tipo_pago: input.tipoPago,
      cuotas_total: cuotas,
      renovacion_fecha: input.renovacionFecha,
    })
    .select("id")
    .single<{ id: string }>();
  if (error) return { ok: false, error: error.message };

  if (input.generarCuotas) {
    const importeCuota = Math.round((input.importeTotal / cuotas) * 100) / 100;
    // La última cuota absorbe el resto del redondeo para que la suma de las
    // cuotas sea EXACTAMENTE el importe total (p. ej. 400/3 → 133,33 + 133,33 + 133,34).
    const importeUltima =
      Math.round((input.importeTotal - importeCuota * (cuotas - 1)) * 100) / 100;
    const filas = Array.from({ length: cuotas }, (_, i) => ({
      coach_id: coachId,
      clienta_id: input.clientaId,
      inscripcion_id: insc.id,
      importe: i === cuotas - 1 ? importeUltima : importeCuota,
      concepto: input.concepto.trim() || "Programa 1-a-1",
      fecha_vencimiento: sumarMeses(input.fechaInicio, i),
      estado: "pendiente" as const,
      origen: input.origenCuotas,
      numero_cuota: i + 1,
    }));
    const { error: errPagos } = await supabase.from("pagos").insert(filas);
    if (errPagos) {
      // La inscripción quedó creada; informamos del fallo de las cuotas.
      revalidatePath(`/clientas/${input.clientaId}`);
      return { ok: false, error: `Inscripción creada, pero falló generar cuotas: ${errPagos.message}` };
    }
  }

  revalidatePath(`/clientas/${input.clientaId}`);
  revalidatePath("/pagos");
  return { ok: true, id: insc.id };
}

export async function cambiarEstadoInscripcion(
  id: string,
  clientaId: string,
  estado: "activa" | "finalizada" | "cancelada"
): Promise<ResultadoAccion> {
  const { supabase, coachId } = await obtenerCoachId();
  if (!coachId) return { ok: false, error: "No autenticada." };

  const { error } = await supabase
    .from("inscripciones")
    .update({ estado, actualizada_en: new Date().toISOString() })
    .eq("id", id)
    .eq("coach_id", coachId);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/clientas/${clientaId}`);
  revalidatePath("/pagos");
  return { ok: true };
}

/** Registra un pago suelto (manual). */
export async function registrarPago(input: {
  clientaId: string;
  inscripcionId: string | null;
  importe: number;
  concepto: string | null;
  fechaVencimiento: string | null;
  origen: OrigenPago | null;
  estado: EstadoPago;
}): Promise<ResultadoAccion> {
  const { supabase, coachId } = await obtenerCoachId();
  if (!coachId) return { ok: false, error: "No autenticada." };

  const { data: clienta } = await supabase
    .from("clientas")
    .select("id")
    .eq("id", input.clientaId)
    .eq("coach_id", coachId)
    .maybeSingle<{ id: string }>();
  if (!clienta) return { ok: false, error: "Clienta no encontrada." };

  if (!Number.isFinite(input.importe) || input.importe <= 0)
    return { ok: false, error: "El importe debe ser mayor que 0." };
  if (input.fechaVencimiento && !fechaValida(input.fechaVencimiento))
    return { ok: false, error: "Fecha de vencimiento no válida." };
  if (input.origen && !ORIGENES.includes(input.origen))
    return { ok: false, error: "Origen de pago no válido." };

  const { error } = await supabase.from("pagos").insert({
    coach_id: coachId,
    clienta_id: input.clientaId,
    inscripcion_id: input.inscripcionId,
    importe: input.importe,
    concepto: input.concepto?.trim() || null,
    fecha_vencimiento: input.fechaVencimiento,
    origen: input.origen,
    estado: input.estado,
    pagado_en: input.estado === "pagado" ? new Date().toISOString() : null,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/clientas/${input.clientaId}`);
  revalidatePath("/pagos");
  return { ok: true };
}

/** Cambia el estado de un pago. Al marcarlo pagado fija pagado_en. */
export async function cambiarEstadoPago(
  id: string,
  clientaId: string,
  estado: EstadoPago,
  origen?: OrigenPago | null
): Promise<ResultadoAccion> {
  const { supabase, coachId } = await obtenerCoachId();
  if (!coachId) return { ok: false, error: "No autenticada." };

  const patch: Record<string, unknown> = {
    estado,
    pagado_en: estado === "pagado" ? new Date().toISOString() : null,
    actualizada_en: new Date().toISOString(),
  };
  if (origen !== undefined) patch.origen = origen;

  const { error } = await supabase
    .from("pagos")
    .update(patch)
    .eq("id", id)
    .eq("coach_id", coachId);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/clientas/${clientaId}`);
  revalidatePath("/pagos");
  return { ok: true };
}

export async function eliminarPago(
  id: string,
  clientaId: string
): Promise<ResultadoAccion> {
  const { supabase, coachId } = await obtenerCoachId();
  if (!coachId) return { ok: false, error: "No autenticada." };

  const { error } = await supabase
    .from("pagos")
    .delete()
    .eq("id", id)
    .eq("coach_id", coachId);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/clientas/${clientaId}`);
  revalidatePath("/pagos");
  return { ok: true };
}
