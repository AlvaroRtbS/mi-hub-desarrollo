import { createSupabaseServerClient } from "@/lib/supabase/server";

type Sesion = { fecha: string; completada: boolean; porcentaje_completado: number };

function fechaISO(d: Date) {
  return d.toISOString().slice(0, 10);
}

const MESES = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
];

export async function HeatmapAnual({ clientaId }: { clientaId: string }) {
  const supabase = await createSupabaseServerClient();

  const hoy = new Date();
  const desde = new Date(hoy);
  desde.setDate(desde.getDate() - 364); // 52 semanas hacia atrás

  const { data: sesionesData } = await supabase
    .from("sesiones")
    .select("fecha, completada, porcentaje_completado")
    .eq("clienta_id", clientaId)
    .gte("fecha", fechaISO(desde));

  const porFecha = new Map<string, Sesion>();
  ((sesionesData ?? []) as Sesion[]).forEach((s) => porFecha.set(s.fecha, s));

  // Alinear el primer día al lunes anterior
  const inicio = new Date(hoy);
  inicio.setDate(inicio.getDate() - 364);
  const dowInicio = (inicio.getDay() + 6) % 7;
  inicio.setDate(inicio.getDate() - dowInicio);

  // Generar 53 columnas (semanas) × 7 filas (días, L→D)
  type Cell = {
    fecha: string;
    estado: "vacio" | "completada" | "parcial" | "perdida" | "futuro";
    pct: number;
    mes: number;
  };
  const columnas: Cell[][] = [];
  for (let s = 0; s < 53; s++) {
    const col: Cell[] = [];
    for (let d = 0; d < 7; d++) {
      const fecha = new Date(inicio);
      fecha.setDate(fecha.getDate() + s * 7 + d);
      const iso = fechaISO(fecha);
      let estado: Cell["estado"] = "vacio";
      let pct = 0;
      if (fecha > hoy) {
        estado = "futuro";
      } else if (porFecha.has(iso)) {
        const sesion = porFecha.get(iso)!;
        pct = sesion.porcentaje_completado;
        estado = sesion.completada
          ? "completada"
          : pct > 0
            ? "parcial"
            : "perdida";
      }
      col.push({ fecha: iso, estado, pct, mes: fecha.getMonth() });
    }
    columnas.push(col);
  }

  // Etiquetas de mes: solo cuando cambia el mes en la primera fila
  const labelsMeses: Array<{ idx: number; label: string }> = [];
  let mesAnterior = -1;
  columnas.forEach((col, i) => {
    const mes = col[0]!.mes;
    if (mes !== mesAnterior) {
      labelsMeses.push({ idx: i, label: MESES[mes]! });
      mesAnterior = mes;
    }
  });

  const sesiones = (sesionesData ?? []) as Sesion[];
  const completadas = sesiones.filter((s) => s.completada).length;
  const totalProgramadas = sesiones.length;
  const adherencia =
    totalProgramadas > 0
      ? Math.round((completadas / totalProgramadas) * 100)
      : 0;

  // Calcular racha actual
  let rachaActual = 0;
  const cursor = new Date(hoy);
  while (true) {
    const iso = fechaISO(cursor);
    const s = porFecha.get(iso);
    if (s && s.completada) {
      rachaActual++;
      cursor.setDate(cursor.getDate() - 1);
    } else if (s && !s.completada) {
      break; // tenía sesión pero no completada → corta la racha
    } else {
      cursor.setDate(cursor.getDate() - 1);
      // si no había sesión programada, seguimos buscando hacia atrás
      if (fechaISO(cursor) < fechaISO(desde)) break;
    }
    if (rachaActual > 365) break;
  }

  return (
    <div className="bg-neutral-900/40 border border-neutral-800 rounded-2xl p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-medium">Año de actividad</h3>
          <p className="text-xs text-neutral-500 mt-0.5">
            {completadas} de {totalProgramadas} sesiones completadas en los
            últimos 12 meses
          </p>
        </div>
        <div className="flex gap-4 text-right">
          <div>
            <div className="text-xl font-semibold" style={{ color: "var(--brand)" }}>
              {adherencia}%
            </div>
            <div className="text-[10px] uppercase text-neutral-500 tracking-wide">
              Adherencia
            </div>
          </div>
          <div>
            <div className="text-xl font-semibold">{rachaActual}</div>
            <div className="text-[10px] uppercase text-neutral-500 tracking-wide">
              Racha
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          {/* Etiquetas de meses */}
          <div className="flex pl-6 mb-1">
            {columnas.map((_, i) => {
              const label = labelsMeses.find((m) => m.idx === i);
              return (
                <div
                  key={i}
                  className="w-3 mr-0.5 text-[9px] text-neutral-500"
                >
                  {label?.label}
                </div>
              );
            })}
          </div>

          {/* Grid: días (filas) × semanas (columnas) */}
          <div className="flex gap-0.5">
            <div className="flex flex-col gap-0.5 mr-1 text-[9px] text-neutral-600 leading-3 pt-[1px]">
              <span>L</span>
              <span> </span>
              <span>X</span>
              <span> </span>
              <span>V</span>
              <span> </span>
              <span>D</span>
            </div>
            {columnas.map((col, i) => (
              <div key={i} className="flex flex-col gap-0.5">
                {col.map((cell, j) => {
                  let cls = "w-3 h-3 rounded-sm border ";
                  let bg: string | undefined;
                  if (cell.estado === "completada") {
                    cls += "border-transparent";
                    bg = "var(--brand)";
                  } else if (cell.estado === "parcial") {
                    cls += "border-transparent";
                    // tono más bajo via opacidad
                    bg = "var(--brand)";
                  } else if (cell.estado === "perdida") {
                    cls += "bg-red-950/40 border-red-900/30";
                  } else if (cell.estado === "futuro") {
                    cls += "bg-neutral-950 border-neutral-900/50";
                  } else {
                    cls += "bg-neutral-900 border-neutral-800";
                  }
                  return (
                    <div
                      key={j}
                      className={cls}
                      style={
                        bg
                          ? {
                              backgroundColor: bg,
                              opacity:
                                cell.estado === "parcial"
                                  ? Math.max(0.25, cell.pct / 100)
                                  : 1,
                            }
                          : undefined
                      }
                      title={`${cell.fecha}: ${
                        cell.estado === "completada"
                          ? "Completada ✓"
                          : cell.estado === "parcial"
                            ? `Parcial (${cell.pct}%)`
                            : cell.estado === "perdida"
                              ? "Sin completar"
                              : cell.estado === "futuro"
                                ? "Futuro"
                                : "Sin programar"
                      }`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 text-[10px] text-neutral-500 mt-3">
        <span>Menos</span>
        <span
          className="w-3 h-3 rounded-sm bg-neutral-900 border border-neutral-800"
          aria-hidden
        />
        <span
          className="w-3 h-3 rounded-sm"
          style={{ backgroundColor: "var(--brand)", opacity: 0.3 }}
          aria-hidden
        />
        <span
          className="w-3 h-3 rounded-sm"
          style={{ backgroundColor: "var(--brand)", opacity: 0.6 }}
          aria-hidden
        />
        <span
          className="w-3 h-3 rounded-sm"
          style={{ backgroundColor: "var(--brand)" }}
          aria-hidden
        />
        <span>Más</span>
      </div>
    </div>
  );
}
