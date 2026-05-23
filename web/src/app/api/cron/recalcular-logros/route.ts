// ============================================================================
// Cron diario (04:00 UTC): recalcular logros para todas las clientas.
// Capta logros por paso de tiempo (mes_1, meses_3, etc.) que solo se
// desbloquean al cumplir días en la app o el programa, no por una acción.
// ============================================================================

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
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

function verificarCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!verificarCron(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json(
      { ok: false, error: "Faltan envs." },
      { status: 500 }
    );
  }
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  const { data: clientas } = await supabase
    .from("clientas")
    .select("id, coach_id, creada_en, gamificacion_activa")
    .in("estado", ["activa", "invitada"]);

  if (!clientas) return NextResponse.json({ ok: true, total: 0 });

  let totalNuevos = 0;

  for (const c of clientas) {
    if (!c.gamificacion_activa) continue;

    const [
      { data: sesiones },
      { data: asignActiva },
      { data: fotos },
      { data: metricas },
      { data: mensajes },
      { data: respuestas },
    ] = await Promise.all([
      supabase.from("sesiones").select("fecha, completada").eq("clienta_id", c.id),
      supabase
        .from("asignaciones")
        .select("fecha_inicio, estructura_snapshot, fecha_fin")
        .eq("clienta_id", c.id)
        .eq("activa", true)
        .order("creada_en", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase.from("fotos_progreso").select("id").eq("clienta_id", c.id),
      supabase
        .from("metricas")
        .select("tipo, valor, fecha")
        .eq("clienta_id", c.id)
        .order("fecha", { ascending: true }),
      supabase
        .from("mensajes")
        .select("id")
        .eq("clienta_id", c.id)
        .eq("remitente", "clienta"),
      supabase.from("formulario_respuestas").select("id").eq("clienta_id", c.id),
    ]);

    const sesionesTyped = (sesiones ?? []) as Array<{
      fecha: string;
      completada: boolean;
    }>;
    const sesionesCompletadas = sesionesTyped.filter((s) => s.completada);

    let rachaActual = 0;
    let rachaMaxima = 0;
    let diasEnAsignacion = 0;

    if (asignActiva) {
      const hoy = new Date().toISOString().slice(0, 10);
      const programados = diasProgramadosDeAsignacion(
        asignActiva.fecha_inicio,
        asignActiva.estructura_snapshot as EstructuraPrograma,
        hoy
      );
      const ad = calcularAdherencia(programados, sesionesTyped);
      rachaActual = ad.rachaActual;
      rachaMaxima = ad.rachaMaxima;
      diasEnAsignacion = Math.floor(
        (new Date(hoy).getTime() -
          new Date(asignActiva.fecha_inicio).getTime()) /
          (24 * 3600 * 1000)
      );
    }

    const metricasTyped = (metricas ?? []) as Array<{
      tipo: string;
      valor: number;
      fecha: string;
    }>;
    const pesos = metricasTyped.filter((m) => m.tipo === "peso");
    const cinturas = metricasTyped.filter((m) => m.tipo === "perimetro_cintura");
    const perdidoKg =
      pesos.length >= 2
        ? Number(pesos[0]!.valor) - Number(pesos[pesos.length - 1]!.valor)
        : 0;
    const perdidoCmCintura =
      cinturas.length >= 2
        ? Number(cinturas[0]!.valor) - Number(cinturas[cinturas.length - 1]!.valor)
        : 0;

    const datos: DatosClientaParaLogros = {
      clientaId: c.id,
      coachId: c.coach_id,
      fechaAlta: c.creada_en,
      sesionesCompletadasTotal: sesionesCompletadas.length,
      rachaActual,
      rachaMaxima,
      diasEnAsignacionActual: diasEnAsignacion,
      numFotos: (fotos ?? []).length,
      numMetricas: metricasTyped.length,
      numMensajesClienta: (mensajes ?? []).length,
      numCheckInsRespondidos: (respuestas ?? []).length,
      perdidoKg,
      perdidoCmCintura,
    };

    const aplicables = logrosAplicables(datos);
    if (aplicables.length === 0) continue;

    const filas = aplicables.map((tipo: TipoLogro) => ({
      coach_id: c.coach_id,
      clienta_id: c.id,
      tipo,
    }));

    const { data: insertados } = await supabase
      .from("logros")
      .upsert(filas, { onConflict: "clienta_id,tipo", ignoreDuplicates: true })
      .select("tipo");

    totalNuevos += (insertados ?? []).length;
  }

  return NextResponse.json({
    ok: true,
    clientas_revisadas: clientas.length,
    nuevos_logros: totalNuevos,
  });
}
