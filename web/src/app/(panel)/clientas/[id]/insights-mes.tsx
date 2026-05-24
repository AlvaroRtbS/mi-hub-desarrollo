import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  TrendingDown,
  TrendingUp,
  Flame,
  Target,
  Activity,
  Camera,
} from "lucide-react";

type Sesion = {
  fecha: string;
  completada: boolean;
  porcentaje_completado: number;
};

type MetricaPunto = {
  tipo: string;
  valor: number;
  unidad: string;
  fecha: string;
};

function fechaISO(d: Date) {
  return d.toISOString().slice(0, 10);
}

/**
 * Widget "Este mes" con insights auto-generados de la clienta.
 * Se calculan en el server a partir de sesiones, métricas y fotos.
 * Devuelve null si la clienta no tiene datos suficientes para mostrar nada.
 */
export async function InsightsMes({ clientaId }: { clientaId: string }) {
  const supabase = await createSupabaseServerClient();

  const hoy = new Date();
  const hace30 = new Date(hoy);
  hace30.setDate(hace30.getDate() - 30);
  const hace60 = new Date(hoy);
  hace60.setDate(hace60.getDate() - 60);

  const [sesionesRes, metricasRes, fotosRes] = await Promise.all([
    supabase
      .from("sesiones")
      .select("fecha, completada, porcentaje_completado")
      .eq("clienta_id", clientaId)
      .gte("fecha", fechaISO(hace60)),
    supabase
      .from("metricas")
      .select("tipo, valor, unidad, fecha")
      .eq("clienta_id", clientaId)
      .gte("fecha", fechaISO(hace60))
      .order("fecha", { ascending: true }),
    supabase
      .from("fotos_progreso")
      .select("id, fecha")
      .eq("clienta_id", clientaId)
      .gte("fecha", fechaISO(hace30)),
  ]);

  const sesiones = (sesionesRes.data ?? []) as Sesion[];
  const metricas = (metricasRes.data ?? []) as MetricaPunto[];
  const fotos = fotosRes.data ?? [];

  const sesionesEsteMes = sesiones.filter(
    (s) => new Date(s.fecha) >= hace30
  );
  const sesionesMesAnterior = sesiones.filter((s) => {
    const f = new Date(s.fecha);
    return f >= hace60 && f < hace30;
  });
  const completadasEsteMes = sesionesEsteMes.filter((s) => s.completada).length;
  const programadasEsteMes = sesionesEsteMes.length;
  const completadasMesAnt = sesionesMesAnterior.filter(
    (s) => s.completada
  ).length;
  const programadasMesAnt = sesionesMesAnterior.length;

  const adhesionEsteMes =
    programadasEsteMes > 0
      ? Math.round((completadasEsteMes / programadasEsteMes) * 100)
      : null;
  const adhesionMesAnt =
    programadasMesAnt > 0
      ? Math.round((completadasMesAnt / programadasMesAnt) * 100)
      : null;

  // Calcular cambios por métrica (primer valor vs último en los últimos 60 días)
  type CambioMetrica = {
    tipo: string;
    unidad: string;
    inicial: number;
    actual: number;
    delta: number;
  };
  const cambiosPorTipo = new Map<string, CambioMetrica>();
  for (const m of metricas) {
    const tipoKey = m.tipo;
    const prev = cambiosPorTipo.get(tipoKey);
    if (!prev) {
      cambiosPorTipo.set(tipoKey, {
        tipo: tipoKey,
        unidad: m.unidad,
        inicial: m.valor,
        actual: m.valor,
        delta: 0,
      });
    } else {
      prev.actual = m.valor;
      prev.delta = m.valor - prev.inicial;
    }
  }
  const cambios = Array.from(cambiosPorTipo.values()).filter(
    (c) => c.inicial !== c.actual
  );

  const insights: Array<{
    icono: React.ReactNode;
    color: string;
    titulo: string;
    detalle: string;
  }> = [];

  // 1) Adherencia este mes vs anterior
  if (adhesionEsteMes != null) {
    if (adhesionMesAnt != null) {
      const diff = adhesionEsteMes - adhesionMesAnt;
      if (Math.abs(diff) >= 5) {
        insights.push({
          icono:
            diff > 0 ? (
              <TrendingUp className="size-5" />
            ) : (
              <TrendingDown className="size-5" />
            ),
          color: diff > 0 ? "text-green-400" : "text-amber-400",
          titulo: `Adherencia ${adhesionEsteMes}% (${diff > 0 ? "+" : ""}${diff} pts vs mes anterior)`,
          detalle: `${completadasEsteMes}/${programadasEsteMes} sesiones este mes`,
        });
      } else {
        insights.push({
          icono: <Activity className="size-5" />,
          color: "text-neutral-300",
          titulo: `Adherencia ${adhesionEsteMes}% (estable)`,
          detalle: `${completadasEsteMes}/${programadasEsteMes} sesiones`,
        });
      }
    } else {
      insights.push({
        icono: <Activity className="size-5" />,
        color: "text-neutral-300",
        titulo: `Adherencia ${adhesionEsteMes}% este mes`,
        detalle: `${completadasEsteMes}/${programadasEsteMes} sesiones`,
      });
    }
  }

  // 2) Cambios en métricas significativos
  for (const c of cambios.slice(0, 3)) {
    const nombre = c.tipo
      .replace(/_/g, " ")
      .replace(/^\w/, (l) => l.toUpperCase());
    const signo = c.delta > 0 ? "+" : "";
    const esPeso = /peso/.test(c.tipo);
    // Para peso: bajar es positivo (suposición habitual coach pérdida)
    const buenSentido = esPeso ? c.delta < 0 : true;
    insights.push({
      icono:
        c.delta > 0 ? (
          <TrendingUp className="size-5" />
        ) : (
          <TrendingDown className="size-5" />
        ),
      color: buenSentido ? "text-green-400" : "text-amber-400",
      titulo: `${nombre}: ${signo}${c.delta.toFixed(1)} ${c.unidad}`,
      detalle: `De ${c.inicial} a ${c.actual} ${c.unidad} en 60 días`,
    });
  }

  // 3) Racha de fotos
  if (fotos.length > 0) {
    insights.push({
      icono: <Camera className="size-5" />,
      color: "text-neutral-300",
      titulo: `${fotos.length} foto${fotos.length === 1 ? "" : "s"} subida${fotos.length === 1 ? "" : "s"} este mes`,
      detalle: "Compara la evolución visual",
    });
  }

  // 4) Racha de adherencia
  if (completadasEsteMes >= 10) {
    insights.push({
      icono: <Flame className="size-5" />,
      color: "text-orange-400",
      titulo: `${completadasEsteMes} sesiones completadas este mes 🔥`,
      detalle: "Buen ritmo — refuerza con un mensaje",
    });
  } else if (
    programadasEsteMes >= 5 &&
    completadasEsteMes === 0
  ) {
    insights.push({
      icono: <Target className="size-5" />,
      color: "text-red-400",
      titulo: `0 sesiones completadas en ${programadasEsteMes} días programados`,
      detalle: "Considera llamar o ajustar el plan",
    });
  }

  if (insights.length === 0) {
    return null;
  }

  return (
    <div
      className="bg-gradient-to-br from-neutral-900/60 to-neutral-900/30 border border-neutral-800 rounded-2xl p-5"
      style={{ borderColor: "color-mix(in srgb, var(--brand) 25%, #262626)" }}
    >
      <h3 className="text-xs uppercase tracking-wide text-neutral-500 mb-3">
        Este mes en una mirada
      </h3>
      <ul className="space-y-2.5">
        {insights.map((ins, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className={"shrink-0 mt-0.5 " + ins.color}>{ins.icono}</span>
            <div className="min-w-0">
              <div className="text-sm text-neutral-100">{ins.titulo}</div>
              <div className="text-xs text-neutral-500 mt-0.5">
                {ins.detalle}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
