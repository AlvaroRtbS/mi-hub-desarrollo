// ============================================================================
// POST /api/gamificacion/recalcular
// ----------------------------------------------------------------------------
// Recalcula los logros desbloqueados de una clienta (o de todas las activas
// si no se pasa clientaId). Otorga los nuevos y los persiste en la tabla
// 'logros'. Idempotente vía índice único (clienta_id, tipo).
//
// Se debería invocar:
//   - Tras completar una sesión
//   - Tras registrar una métrica o foto
//   - Tras un check-in respondido
//   - Periódicamente (cron diario) por si pasan umbrales de tiempo (mes_1, ...)
//
// Body opcional: { clientaId?: string }
// Devuelve: { ok, nuevos: TipoLogro[] }
// ============================================================================

import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { EstructuraPrograma } from "@/lib/supabase/tipos";
import {
  diasProgramadosDeAsignacion,
  calcularAdherencia,
} from "@/lib/adherencia";
import {
  logrosAplicables,
  type DatosClientaParaLogros,
  type TipoLogro,
} from "@/lib/gamificacion";
import { hoyISO } from "@/lib/utilidades";

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

async function recalcularParaClienta(
  clientaId: string,
  coachId: string
): Promise<TipoLogro[]> {
  const supabase = await createSupabaseServerClient();

  // Obtener datos
  const [
    { data: clienta },
    { data: sesionesData },
    { data: asignActiva },
    { data: fotosData },
    { data: metricasData },
    { data: mensajesData },
    { data: respuestasData },
  ] = await Promise.all([
    supabase
      .from("clientas")
      .select("id, creada_en, gamificacion_activa")
      .eq("id", clientaId)
      .maybeSingle(),
    supabase
      .from("sesiones")
      .select("fecha, completada")
      .eq("clienta_id", clientaId),
    supabase
      .from("asignaciones")
      .select("fecha_inicio, estructura_snapshot, fecha_fin")
      .eq("clienta_id", clientaId)
      .eq("activa", true)
      .order("creada_en", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("fotos_progreso")
      .select("id")
      .eq("clienta_id", clientaId),
    supabase
      .from("metricas")
      .select("tipo, valor, fecha")
      .eq("clienta_id", clientaId)
      .order("fecha", { ascending: true }),
    supabase
      .from("mensajes")
      .select("id")
      .eq("clienta_id", clientaId)
      .eq("remitente", "clienta"),
    supabase
      .from("formulario_asignaciones")
      .select("id")
      .eq("clienta_id", clientaId)
      .eq("completado", true),
  ]);

  if (!clienta || !clienta.gamificacion_activa) return [];

  const sesiones = (sesionesData ?? []) as Array<{
    fecha: string;
    completada: boolean;
  }>;
  const sesionesCompletadas = sesiones.filter((s) => s.completada);

  let rachaActual = 0;
  let rachaMaxima = 0;
  let diasEnAsignacion = 0;

  if (asignActiva) {
    const hoy = hoyISO();
    const programados = diasProgramadosDeAsignacion(
      asignActiva.fecha_inicio,
      asignActiva.estructura_snapshot as EstructuraPrograma,
      hoy
    );
    const ad = calcularAdherencia(programados, sesiones);
    rachaActual = ad.rachaActual;
    rachaMaxima = ad.rachaMaxima;
    diasEnAsignacion = Math.floor(
      (new Date(hoy).getTime() -
        new Date(asignActiva.fecha_inicio).getTime()) /
        (24 * 3600 * 1000)
    );
  }

  // Cálculo de "perdido" — primera vs última medida
  const metricas = (metricasData ?? []) as Array<{
    tipo: string;
    valor: number;
    fecha: string;
  }>;
  const pesos = metricas.filter((m) => m.tipo === "peso");
  const cinturas = metricas.filter((m) => m.tipo === "perimetro_cintura");
  const perdidoKg =
    pesos.length >= 2 ? Number(pesos[0]!.valor) - Number(pesos[pesos.length - 1]!.valor) : 0;
  const perdidoCmCintura =
    cinturas.length >= 2
      ? Number(cinturas[0]!.valor) - Number(cinturas[cinturas.length - 1]!.valor)
      : 0;

  const datos: DatosClientaParaLogros = {
    clientaId,
    coachId,
    fechaAlta: clienta.creada_en,
    sesionesCompletadasTotal: sesionesCompletadas.length,
    rachaActual,
    rachaMaxima,
    diasEnAsignacionActual: diasEnAsignacion,
    numFotos: (fotosData ?? []).length,
    numMetricas: metricas.length,
    numMensajesClienta: (mensajesData ?? []).length,
    numCheckInsRespondidos: (respuestasData ?? []).length,
    perdidoKg,
    perdidoCmCintura,
  };

  const aplicables = logrosAplicables(datos);

  if (aplicables.length === 0) return [];

  // Insertar (con ON CONFLICT DO NOTHING vía el índice único)
  const filas = aplicables.map((tipo) => ({
    coach_id: coachId,
    clienta_id: clientaId,
    tipo,
  }));

  const { data: insertados } = await supabase
    .from("logros")
    .upsert(filas, { onConflict: "clienta_id,tipo", ignoreDuplicates: true })
    .select("tipo");

  return (insertados ?? []).map((r) => r.tipo as TipoLogro);
}

export async function POST(request: Request) {
  const coachId = await obtenerCoachId();
  if (!coachId) {
    return NextResponse.json(
      { ok: false, error: "No autenticada." },
      { status: 401 }
    );
  }

  let body: { clientaId?: string } = {};
  try {
    body = await request.json();
  } catch {
    // body opcional
  }

  const supabase = await createSupabaseServerClient();

  if (body.clientaId) {
    const nuevos = await recalcularParaClienta(body.clientaId, coachId);
    return NextResponse.json({ ok: true, nuevos, total: nuevos.length });
  }

  // Recalcular para todas las clientas activas
  const { data: clientas } = await supabase
    .from("clientas")
    .select("id")
    .eq("coach_id", coachId)
    .in("estado", ["activa", "invitada"]);

  let total = 0;
  const detalle: Record<string, number> = {};
  for (const c of clientas ?? []) {
    const nuevos = await recalcularParaClienta(c.id, coachId);
    if (nuevos.length > 0) {
      detalle[c.id] = nuevos.length;
      total += nuevos.length;
    }
  }
  return NextResponse.json({
    ok: true,
    total_clientas: clientas?.length ?? 0,
    nuevos_logros: total,
    detalle,
  });
}
