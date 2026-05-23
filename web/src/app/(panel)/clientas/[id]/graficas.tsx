import { createSupabaseServerClient } from "@/lib/supabase/server";

type Punto = { fecha: string; valor: number };

type SerieMetrica = {
  tipo: string;
  label: string;
  unidad: string;
  color: string;
  puntos: Punto[];
};

const CONFIG: Array<Omit<SerieMetrica, "puntos">> = [
  { tipo: "peso", label: "Peso", unidad: "kg", color: "#22c55e" },
  { tipo: "perimetro_cintura", label: "Cintura", unidad: "cm", color: "#3b82f6" },
  { tipo: "perimetro_cadera", label: "Cadera", unidad: "cm", color: "#a855f7" },
  { tipo: "perimetro_brazo", label: "Brazo", unidad: "cm", color: "#f97316" },
  { tipo: "porcentaje_grasa", label: "% Grasa", unidad: "%", color: "#ef4444" },
  { tipo: "masa_muscular", label: "Masa musc.", unidad: "kg", color: "#06b6d4" },
];

export async function GraficasMetricas({ clientaId }: { clientaId: string }) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("metricas")
    .select("tipo, valor, fecha")
    .eq("clienta_id", clientaId)
    .order("fecha", { ascending: true });

  const todas = (data ?? []) as Array<{
    tipo: string;
    valor: number;
    fecha: string;
  }>;

  const series: SerieMetrica[] = CONFIG.map((c) => ({
    ...c,
    puntos: todas
      .filter((m) => m.tipo === c.tipo)
      .map((m) => ({ fecha: m.fecha, valor: Number(m.valor) })),
  })).filter((s) => s.puntos.length > 0);

  if (series.length === 0) {
    return (
      <div className="text-sm text-neutral-500 py-6 text-center">
        Sin métricas registradas. Añade alguna en{" "}
        <a href="/metricas" className="text-brand-500">
          Métricas
        </a>{" "}
        para ver la evolución.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {series.map((s) => (
        <GraficaSerie key={s.tipo} serie={s} />
      ))}
    </div>
  );
}

function GraficaSerie({ serie }: { serie: SerieMetrica }) {
  const W = 320;
  const H = 140;
  const PAD = 28;

  const puntos = serie.puntos;
  if (puntos.length === 0) return null;

  const valores = puntos.map((p) => p.valor);
  const min = Math.min(...valores);
  const max = Math.max(...valores);
  const rango = max - min || 1;
  const minVista = min - rango * 0.1;
  const maxVista = max + rango * 0.1;
  const rangoVista = maxVista - minVista;

  const x0 = puntos[0]!.fecha;
  const xLast = puntos[puntos.length - 1]!.fecha;
  const diasTotal =
    Math.max(
      1,
      Math.floor(
        (new Date(xLast + "T00:00:00Z").getTime() -
          new Date(x0 + "T00:00:00Z").getTime()) /
          86400000
      )
    );

  function x(fecha: string) {
    const d =
      (new Date(fecha + "T00:00:00Z").getTime() -
        new Date(x0 + "T00:00:00Z").getTime()) /
      86400000;
    return PAD + (d / diasTotal) * (W - PAD * 2);
  }
  function y(v: number) {
    return PAD + (1 - (v - minVista) / rangoVista) * (H - PAD * 2);
  }

  const path = puntos
    .map((p, i) => (i === 0 ? "M" : "L") + x(p.fecha) + "," + y(p.valor))
    .join(" ");

  const areaPath =
    path +
    ` L${x(puntos[puntos.length - 1]!.fecha)},${H - PAD}` +
    ` L${x(puntos[0]!.fecha)},${H - PAD} Z`;

  const ultimo = puntos[puntos.length - 1]!;
  const primero = puntos[0]!;
  const delta = ultimo.valor - primero.valor;
  const deltaPorcentual =
    primero.valor !== 0 ? (delta / primero.valor) * 100 : 0;

  // Para el comparador: menos peso = mejor (verde) en peso y % grasa;
  // depende. Para no equivocarnos en interpretaciones, mostramos siempre
  // delta neutral (gris con flecha).
  const flecha = delta > 0 ? "↑" : delta < 0 ? "↓" : "→";

  return (
    <div className="border border-neutral-900 rounded-xl p-3 bg-neutral-950">
      <div className="flex items-baseline justify-between mb-1">
        <div className="text-sm font-medium" style={{ color: serie.color }}>
          {serie.label}
        </div>
        <div className="text-xs text-neutral-500">
          {puntos.length} {puntos.length === 1 ? "medida" : "medidas"}
        </div>
      </div>
      <div className="flex items-baseline gap-2 mb-2">
        <div className="text-2xl font-semibold text-neutral-100">
          {ultimo.valor}
          <span className="text-sm text-neutral-500 ml-1">{serie.unidad}</span>
        </div>
        {puntos.length >= 2 && (
          <div className="text-xs text-neutral-500">
            {flecha} {Math.abs(delta).toFixed(1)} {serie.unidad}{" "}
            ({deltaPorcentual >= 0 ? "+" : ""}
            {deltaPorcentual.toFixed(1)}%)
          </div>
        )}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto block">
        {/* Eje horizontal de referencia */}
        <line
          x1={PAD}
          y1={H - PAD}
          x2={W - PAD}
          y2={H - PAD}
          stroke="#262626"
          strokeWidth={1}
        />
        {/* Área */}
        <path d={areaPath} fill={serie.color} opacity={0.1} />
        {/* Línea */}
        <path
          d={path}
          fill="none"
          stroke={serie.color}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {/* Puntos */}
        {puntos.map((p) => (
          <circle
            key={p.fecha}
            cx={x(p.fecha)}
            cy={y(p.valor)}
            r={3}
            fill={serie.color}
          />
        ))}
        {/* Etiquetas de extremos */}
        <text
          x={PAD}
          y={H - 8}
          fontSize={9}
          fill="#525252"
          textAnchor="start"
        >
          {formatearFechaCorta(primero.fecha)}
        </text>
        <text
          x={W - PAD}
          y={H - 8}
          fontSize={9}
          fill="#525252"
          textAnchor="end"
        >
          {formatearFechaCorta(ultimo.fecha)}
        </text>
        <text
          x={PAD - 4}
          y={y(max) + 3}
          fontSize={9}
          fill="#525252"
          textAnchor="end"
        >
          {max}
        </text>
        <text
          x={PAD - 4}
          y={y(min) + 3}
          fontSize={9}
          fill="#525252"
          textAnchor="end"
        >
          {min}
        </text>
      </svg>
    </div>
  );
}

function formatearFechaCorta(iso: string): string {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
  });
}
