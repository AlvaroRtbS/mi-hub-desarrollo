import { createSupabaseServerClient } from "@/lib/supabase/server";

type Sesion = { fecha: string; completada: boolean };

function fechaISO(d: Date) {
  return d.toISOString().slice(0, 10);
}

export async function HeatmapAdherencia({ clientaId }: { clientaId: string }) {
  const supabase = await createSupabaseServerClient();

  // Últimas 12 semanas (84 días)
  const hoy = new Date();
  const desde = new Date(hoy);
  desde.setDate(desde.getDate() - 83);

  const { data: sesionesData } = await supabase
    .from("sesiones")
    .select("fecha, completada")
    .eq("clienta_id", clientaId)
    .gte("fecha", fechaISO(desde));

  const sesionesPorFecha = new Map<string, boolean>();
  ((sesionesData ?? []) as Sesion[]).forEach((s) => {
    sesionesPorFecha.set(s.fecha, s.completada);
  });

  // Generar 12 semanas x 7 días
  // Empezamos por el lunes de hace 12 semanas
  const inicio = new Date(hoy);
  inicio.setDate(inicio.getDate() - 83);
  const dowInicio = (inicio.getDay() + 6) % 7; // lunes = 0
  inicio.setDate(inicio.getDate() - dowInicio);

  const semanas: Array<Array<{ fecha: string; estado: "vacio" | "completada" | "perdida" | "futuro" }>> = [];
  for (let s = 0; s < 13; s++) {
    const semana: typeof semanas[0] = [];
    for (let d = 0; d < 7; d++) {
      const fecha = new Date(inicio);
      fecha.setDate(fecha.getDate() + s * 7 + d);
      const iso = fechaISO(fecha);
      let estado: "vacio" | "completada" | "perdida" | "futuro" = "vacio";
      if (fecha > hoy) {
        estado = "futuro";
      } else if (sesionesPorFecha.has(iso)) {
        estado = sesionesPorFecha.get(iso) ? "completada" : "perdida";
      }
      semana.push({ fecha: iso, estado });
    }
    semanas.push(semana);
  }

  const totales = {
    completadas: ((sesionesData ?? []) as Sesion[]).filter((s) => s.completada).length,
    total: (sesionesData ?? []).length,
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs text-neutral-500">
          Últimas 12 semanas · {totales.completadas} sesiones completadas
        </div>
        <div className="flex items-center gap-2 text-[10px] text-neutral-500">
          <span>Menos</span>
          <div className="flex gap-0.5">
            <span className="w-3 h-3 rounded-sm bg-neutral-900 border border-neutral-800" />
            <span className="w-3 h-3 rounded-sm bg-brand-900/50" />
            <span className="w-3 h-3 rounded-sm bg-brand-700" />
            <span className="w-3 h-3 rounded-sm bg-brand-500" />
          </div>
          <span>Más</span>
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto pb-2">
        <div className="flex flex-col gap-1 text-[9px] text-neutral-600 pr-1 justify-around">
          <span></span>
          <span>L</span>
          <span></span>
          <span>X</span>
          <span></span>
          <span>V</span>
          <span></span>
        </div>
        {semanas.map((sem, i) => (
          <div key={i} className="flex flex-col gap-1">
            {sem.map((dia, j) => {
              const color =
                dia.estado === "completada"
                  ? "bg-brand-500 border-brand-400"
                  : dia.estado === "perdida"
                  ? "bg-red-950/40 border-red-900/30"
                  : dia.estado === "futuro"
                  ? "bg-neutral-950 border-neutral-900"
                  : "bg-neutral-900 border-neutral-800";
              return (
                <div
                  key={j}
                  className={"w-3 h-3 rounded-sm border " + color}
                  title={`${dia.fecha}: ${
                    dia.estado === "completada"
                      ? "Sesión completada ✓"
                      : dia.estado === "perdida"
                      ? "Sesión sin completar"
                      : dia.estado === "futuro"
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
  );
}
