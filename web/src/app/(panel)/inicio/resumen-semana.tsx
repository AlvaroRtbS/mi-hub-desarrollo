import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  Activity,
  MessageSquare,
  Camera,
  TrendingDown,
  UserPlus,
  Ruler,
} from "lucide-react";

function fechaISO(d: Date) {
  return d.toISOString().slice(0, 10);
}

/**
 * Widget "Esta semana en cifras" — métricas agregadas del negocio del coach.
 * Solo mira los datos de los últimos 7 días.
 *
 * KPIs:
 *   - Sesiones completadas en total
 *   - Mensajes intercambiados (coach + clienta combinados)
 *   - Fotos de progreso subidas
 *   - Total kg de progreso en clientas (suma de deltas semanales)
 *   - Nuevas clientas registradas
 *   - Métricas registradas en total
 *
 * Compacto, una sola línea de tarjetas en /inicio.
 */
export async function ResumenSemana() {
  const supabase = await createSupabaseServerClient();
  const hoy = new Date();
  const hace7 = new Date(hoy);
  hace7.setDate(hace7.getDate() - 7);
  const desde = fechaISO(hace7);

  const [
    sesionesRes,
    mensajesRes,
    fotosRes,
    clientasNuevasRes,
    metricasRes,
    pesosRes,
  ] = await Promise.all([
    supabase
      .from("sesiones")
      .select("id", { count: "exact", head: true })
      .eq("completada", true)
      .gte("fecha", desde),
    supabase
      .from("mensajes")
      .select("id", { count: "exact", head: true })
      .gte("enviado_en", hace7.toISOString()),
    supabase
      .from("fotos_progreso")
      .select("id", { count: "exact", head: true })
      .gte("fecha", desde),
    supabase
      .from("clientas")
      .select("id", { count: "exact", head: true })
      .gte("creada_en", hace7.toISOString()),
    supabase
      .from("metricas")
      .select("id", { count: "exact", head: true })
      .gte("fecha", desde),
    // Calcular total de progreso de peso: para cada clienta, último peso
    // de esta semana vs último peso de la semana anterior.
    supabase
      .from("metricas")
      .select("clienta_id, valor, fecha")
      .eq("tipo", "peso")
      .gte("fecha", fechaISO(new Date(hoy.getTime() - 14 * 86400000)))
      .order("fecha", { ascending: true }),
  ]);

  // Suma agregada de deltas de peso: último valor de esta semana vs
  // último valor de la semana anterior, por clienta.
  const pesos = (pesosRes.data ?? []) as Array<{
    clienta_id: string;
    valor: number;
    fecha: string;
  }>;
  const porClienta = new Map<
    string,
    { semanaAnterior: number | null; semanaActual: number | null }
  >();
  for (const p of pesos) {
    const c = porClienta.get(p.clienta_id) ?? {
      semanaAnterior: null,
      semanaActual: null,
    };
    if (p.fecha >= desde) {
      c.semanaActual = p.valor;
    } else {
      c.semanaAnterior = p.valor;
    }
    porClienta.set(p.clienta_id, c);
  }
  let totalDelta = 0;
  let clientasConDelta = 0;
  for (const c of porClienta.values()) {
    if (c.semanaActual != null && c.semanaAnterior != null) {
      totalDelta += c.semanaActual - c.semanaAnterior;
      clientasConDelta++;
    }
  }

  const items = [
    {
      icono: <Activity className="size-4" />,
      label: "Sesiones",
      valor: sesionesRes.count ?? 0,
      sub: "completadas",
    },
    {
      icono: <MessageSquare className="size-4" />,
      label: "Mensajes",
      valor: mensajesRes.count ?? 0,
      sub: "intercambiados",
    },
    {
      icono: <Camera className="size-4" />,
      label: "Fotos",
      valor: fotosRes.count ?? 0,
      sub: "de progreso",
    },
    {
      icono: <Ruler className="size-4" />,
      label: "Métricas",
      valor: metricasRes.count ?? 0,
      sub: "registradas",
    },
    {
      icono: <TrendingDown className="size-4" />,
      label: "Δ Peso",
      valor:
        clientasConDelta > 0
          ? `${totalDelta >= 0 ? "+" : ""}${totalDelta.toFixed(1)}`
          : "—",
      sub:
        clientasConDelta > 0
          ? `kg (${clientasConDelta} clientas)`
          : "sin medir",
      destacado: clientasConDelta > 0 && totalDelta < 0,
    },
    {
      icono: <UserPlus className="size-4" />,
      label: "Nuevas",
      valor: clientasNuevasRes.count ?? 0,
      sub: "clientas",
    },
  ];

  return (
    <div className="border border-neutral-800 rounded-2xl p-5">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="font-semibold">Esta semana en cifras</h2>
        <span className="text-xs text-neutral-500">Últimos 7 días</span>
      </div>
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        {items.map((it, i) => (
          <div
            key={i}
            className="bg-neutral-900/50 border border-neutral-900 rounded-lg p-3 text-center"
            style={
              it.destacado
                ? {
                    borderColor: "color-mix(in srgb, var(--brand) 50%, transparent)",
                    backgroundColor:
                      "color-mix(in srgb, var(--brand) 8%, transparent)",
                  }
                : undefined
            }
          >
            <div
              className="flex items-center justify-center text-neutral-500 mb-1"
              style={it.destacado ? { color: "var(--brand)" } : undefined}
            >
              {it.icono}
            </div>
            <div
              className="text-xl font-semibold tabular-nums"
              style={it.destacado ? { color: "var(--brand)" } : undefined}
            >
              {it.valor}
            </div>
            <div className="text-[10px] uppercase tracking-wide text-neutral-500 mt-0.5">
              {it.label}
            </div>
            <div className="text-[10px] text-neutral-600 truncate">
              {it.sub}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
