import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { obtenerUrlFirmada } from "@/lib/supabase/archivos";
import { EmptyState } from "@/components/ui/empty-state";
import { formatearFecha } from "@/lib/utilidades";
import type {
  EstructuraPrograma,
  ElementoEjercicio,
  Ejercicio,
} from "@/lib/supabase/tipos";

type Aparicion = {
  fechaProgramada: string; // ISO
  semana: number;
  dia: number;
  programaNombre: string;
  programaId: string;
  // Plan original (lo que la entrenadora programó)
  planSeries: Array<{ reps: string; peso: string }>;
  // Lo que la clienta realmente registró (puede ser null si no completó)
  realSeries: Array<{ reps?: string; peso?: string; completado?: boolean }> | null;
  notasClienta: string | null;
};

function fechaProgramada(inicio: string, semana: number, dia: number): string {
  const d = new Date(inicio + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + (semana - 1) * 7 + (dia - 1));
  return d.toISOString().slice(0, 10);
}

export default async function HistoricoEjercicioPage({
  params,
}: {
  params: Promise<{ id: string; ejercicioId: string }>;
}) {
  const { id: clientaId, ejercicioId } = await params;
  const supabase = await createSupabaseServerClient();

  const [{ data: clienta }, { data: ejercicio }] = await Promise.all([
    supabase
      .from("clientas")
      .select("id, nombre, apellidos")
      .eq("id", clientaId)
      .maybeSingle(),
    supabase
      .from("ejercicios")
      .select("id, nombre, descripcion, imagen_url, video_url, grupos_musculares, material")
      .eq("id", ejercicioId)
      .maybeSingle<Ejercicio>(),
  ]);

  if (!clienta || !ejercicio) notFound();

  // Asignaciones de esta clienta con su estructura snapshot
  const { data: asignacionesData } = await supabase
    .from("asignaciones")
    .select(
      "id, programa_id, fecha_inicio, estructura_snapshot, programas(nombre)"
    )
    .eq("clienta_id", clientaId)
    .order("creada_en", { ascending: false });

  const asignaciones = (asignacionesData ?? []) as unknown as Array<{
    id: string;
    programa_id: string;
    fecha_inicio: string;
    estructura_snapshot: EstructuraPrograma;
    programas: { nombre: string } | null;
  }>;

  // Todas las sesiones de la clienta
  const { data: sesionesData } = await supabase
    .from("sesiones")
    .select("id, fecha, registros, notas_clienta, completada")
    .eq("clienta_id", clientaId);
  const sesiones = (sesionesData ?? []) as Array<{
    id: string;
    fecha: string;
    registros: Record<string, { series_realizadas?: Array<{ peso?: string; reps?: string; completado?: boolean }>; peso?: string; reps?: string; completado?: boolean }>;
    notas_clienta: string | null;
    completada: boolean;
  }>;
  const sesionPorFecha = new Map(sesiones.map((s) => [s.fecha, s]));

  // Recorre asignaciones buscando apariciones del ejercicio
  const apariciones: Aparicion[] = [];
  for (const a of asignaciones) {
    const estructura = a.estructura_snapshot ?? [];
    for (const sem of estructura) {
      for (const dia of sem.dias) {
        for (const bloque of dia.bloques) {
          for (const elemento of bloque.elementos) {
            if (
              elemento.tipo === "ejercicio" &&
              (elemento as ElementoEjercicio).ejercicio_id === ejercicioId
            ) {
              const ej = elemento as ElementoEjercicio;
              const fecha = fechaProgramada(a.fecha_inicio, sem.semana, dia.dia);
              const sesion = sesionPorFecha.get(fecha);
              const registro = sesion?.registros?.[ej.id];
              apariciones.push({
                fechaProgramada: fecha,
                semana: sem.semana,
                dia: dia.dia,
                programaNombre: a.programas?.nombre ?? "Programa",
                programaId: a.programa_id,
                planSeries: ej.series.map((s) => ({
                  reps: s.reps,
                  peso: s.peso,
                })),
                realSeries: registro?.series_realizadas ?? null,
                notasClienta: sesion?.notas_clienta ?? null,
              });
            }
          }
        }
      }
    }
  }

  // Orden: más recientes primero
  apariciones.sort((a, b) =>
    a.fechaProgramada < b.fechaProgramada ? 1 : -1
  );

  const imagenUrl = await obtenerUrlFirmada(
    "ejercicios-imagenes",
    ejercicio.imagen_url,
    3600
  );
  const videoUrl = await obtenerUrlFirmada(
    "ejercicios-videos",
    ejercicio.video_url,
    3600
  );

  // Para la gráfica de evolución de peso, extraer "peso máximo real" por fecha
  const puntosGrafica: Array<{ fecha: string; peso: number }> = [];
  for (const ap of [...apariciones].reverse()) {
    if (!ap.realSeries || ap.realSeries.length === 0) continue;
    let max = 0;
    for (const s of ap.realSeries) {
      const v = parseFloat(s.peso ?? "");
      if (!isNaN(v) && v > max) max = v;
    }
    if (max > 0) puntosGrafica.push({ fecha: ap.fechaProgramada, peso: max });
  }

  return (
    <div className="p-8 max-w-5xl">
      <Link
        href={`/clientas/${clientaId}?tab=actividad`}
        className="text-sm text-neutral-400 hover:text-neutral-200"
      >
        ← Volver a {clienta.nombre}
      </Link>

      <div className="mt-4 flex items-start gap-4">
        {imagenUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imagenUrl}
            alt=""
            className="w-20 h-20 rounded-xl object-cover border border-neutral-800"
          />
        ) : (
          <div className="w-20 h-20 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-2xl">
            🏋️
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="text-xs uppercase tracking-wide text-neutral-500 mb-0.5">
            Histórico de ejercicio · {clienta.nombre} {clienta.apellidos ?? ""}
          </div>
          <h1 className="text-2xl font-semibold">{ejercicio.nombre}</h1>
          <div className="flex flex-wrap gap-1 mt-2">
            {(ejercicio.grupos_musculares ?? []).map((g) => (
              <span
                key={g}
                className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-900 border border-neutral-800 text-neutral-400"
              >
                {g}
              </span>
            ))}
            {(ejercicio.material ?? []).map((m) => (
              <span
                key={m}
                className="text-[10px] px-2 py-0.5 rounded-full bg-brand-950/30 border border-brand-900/40 text-brand-400"
              >
                {m}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Gráfica simple de evolución */}
      {puntosGrafica.length >= 2 && (
        <div className="mt-6 border border-neutral-800 rounded-2xl p-5">
          <h3 className="font-medium mb-3">Evolución del peso (max por sesión)</h3>
          <GraficaPeso puntos={puntosGrafica} />
        </div>
      )}

      {/* Apariciones */}
      <div className="mt-6">
        {apariciones.length === 0 ? (
          <EmptyState
            icono="📊"
            titulo="Este ejercicio no aparece en sus programas"
            descripcion="Se mostrará el histórico cuando lo incluyas en alguno de los programas que asignas a esta clienta."
          />
        ) : (
          <div className="border border-neutral-800 rounded-2xl overflow-hidden">
            <div className="bg-neutral-900 px-4 py-2 text-xs uppercase tracking-wide text-neutral-500 grid grid-cols-[80px_60px_1fr_1fr_60px] gap-3">
              <div>Fecha</div>
              <div>S/D</div>
              <div>Plan</div>
              <div>Real</div>
              <div className="text-right">Estado</div>
            </div>
            {apariciones.map((a, i) => {
              const completada =
                a.realSeries !== null &&
                a.realSeries.length > 0 &&
                a.realSeries.every((s) => s.completado);
              const esHoy = a.fechaProgramada === new Date().toISOString().slice(0, 10);
              const esPasado = a.fechaProgramada < new Date().toISOString().slice(0, 10);
              return (
                <div
                  key={i}
                  className="px-4 py-2.5 grid grid-cols-[80px_60px_1fr_1fr_60px] gap-3 items-start text-sm border-t border-neutral-900 hover:bg-neutral-900/30"
                >
                  <div>
                    <div className="text-neutral-200">
                      {formatearFecha(a.fechaProgramada)}
                    </div>
                    {esHoy && (
                      <div className="text-[10px] text-brand-400">Hoy</div>
                    )}
                  </div>
                  <div className="text-neutral-400">
                    S{a.semana} · D{a.dia}
                  </div>
                  <div className="text-neutral-300">
                    {resumenSeries(a.planSeries)}
                  </div>
                  <div>
                    {a.realSeries && a.realSeries.length > 0 ? (
                      <span className="text-neutral-100">
                        {resumenSeries(
                          a.realSeries.map((s) => ({
                            reps: s.reps ?? "",
                            peso: s.peso ?? "",
                          }))
                        )}
                      </span>
                    ) : esPasado ? (
                      <span className="text-neutral-600 text-xs italic">
                        No registrado
                      </span>
                    ) : (
                      <span className="text-neutral-700 text-xs">
                        Pendiente
                      </span>
                    )}
                    {a.notasClienta && (
                      <div className="text-[10px] text-neutral-500 italic mt-0.5 line-clamp-2">
                        {a.notasClienta}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    {completada ? (
                      <span className="text-green-400">✓</span>
                    ) : esPasado ? (
                      <span className="text-neutral-700">○</span>
                    ) : (
                      <span className="text-neutral-700">·</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {videoUrl && (
        <div className="mt-6 border border-neutral-800 rounded-2xl p-5">
          <h3 className="font-medium mb-3">Vídeo demostrativo</h3>
          <video
            src={videoUrl}
            controls
            preload="metadata"
            className="w-full max-h-96 rounded-lg bg-black"
          />
        </div>
      )}
    </div>
  );
}

function resumenSeries(
  series: Array<{ reps: string; peso: string }>
): string {
  if (series.length === 0) return "—";
  // Si todas las series son iguales, formatear como "Nx<reps> @ <peso>"
  const primera = series[0]!;
  const todasIguales = series.every(
    (s) => s.reps === primera.reps && s.peso === primera.peso
  );
  if (todasIguales) {
    return `${series.length}×${primera.reps}${primera.peso ? ` @ ${primera.peso}` : ""}`;
  }
  return series
    .map((s, i) => `${i + 1}) ${s.reps}${s.peso ? `@${s.peso}` : ""}`)
    .join(" · ");
}

function GraficaPeso({
  puntos,
}: {
  puntos: Array<{ fecha: string; peso: number }>;
}) {
  const w = 600;
  const h = 200;
  const pad = 30;

  const xs = puntos.map((_, i) => i);
  const ys = puntos.map((p) => p.peso);
  const minY = Math.floor(Math.min(...ys) * 0.95);
  const maxY = Math.ceil(Math.max(...ys) * 1.05);
  const rangoY = Math.max(1, maxY - minY);

  const px = (i: number) =>
    pad + (i / Math.max(1, xs.length - 1)) * (w - pad * 2);
  const py = (v: number) =>
    h - pad - ((v - minY) / rangoY) * (h - pad * 2);

  const path = puntos
    .map((p, i) => `${i === 0 ? "M" : "L"} ${px(i)} ${py(p.peso)}`)
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="w-full h-auto text-brand-500"
      aria-label="Gráfica de evolución del peso"
    >
      {/* Eje Y mín/máx */}
      <text
        x={pad - 4}
        y={pad + 4}
        textAnchor="end"
        className="fill-neutral-600 text-[10px]"
      >
        {maxY}
      </text>
      <text
        x={pad - 4}
        y={h - pad + 4}
        textAnchor="end"
        className="fill-neutral-600 text-[10px]"
      >
        {minY}
      </text>
      <line
        x1={pad}
        y1={pad}
        x2={pad}
        y2={h - pad}
        className="stroke-neutral-800"
      />
      <line
        x1={pad}
        y1={h - pad}
        x2={w - pad}
        y2={h - pad}
        className="stroke-neutral-800"
      />
      <path d={path} className="stroke-brand-500" strokeWidth={2} fill="none" />
      {puntos.map((p, i) => (
        <g key={i}>
          <circle
            cx={px(i)}
            cy={py(p.peso)}
            r={3.5}
            className="fill-brand-500"
          />
          <title>
            {new Date(p.fecha).toLocaleDateString("es-ES")}: {p.peso} kg
          </title>
        </g>
      ))}
    </svg>
  );
}
