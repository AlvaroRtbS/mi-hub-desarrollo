import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatearFecha, inicialesNombre, hoyISO } from "@/lib/utilidades";
import { obtenerUrlsFirmadas } from "@/lib/supabase/archivos";
import { BotonImprimirCabecera } from "../../../boton-imprimir-cabecera";

export const metadata = {
  title: "Imprimir ficha de clienta",
};

function isoHoy(): string {
  return hoyISO();
}

function diasEntre(a: string, b: string): number {
  return Math.floor(
    (new Date(b + "T00:00:00Z").getTime() -
      new Date(a + "T00:00:00Z").getTime()) /
      86400000
  );
}

export default async function ImprimirClientaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: clienta } = await supabase
    .from("clientas")
    .select(
      "id, nombre, apellidos, email, telefono, fecha_nacimiento, foto_url, estado, creada_en, coach_id"
    )
    .eq("id", id)
    .maybeSingle();

  if (!clienta) notFound();

  const [coachRes, asignacionRes, metricasRes, sesionesRes, fotosRes, notasRes] =
    await Promise.all([
      supabase
        .from("coaches")
        .select("nombre, marca_nombre, marca_color_primario, marca_logo_url, email")
        .eq("id", clienta.coach_id)
        .maybeSingle(),
      supabase
        .from("asignaciones")
        .select("fecha_inicio, fecha_fin, estructura_snapshot, programas(nombre)")
        .eq("clienta_id", id)
        .eq("activa", true)
        .maybeSingle(),
      supabase
        .from("metricas")
        .select("tipo, valor, unidad, fecha")
        .eq("clienta_id", id)
        .order("fecha", { ascending: true }),
      supabase
        .from("sesiones")
        .select("fecha, completada, porcentaje_completado")
        .eq("clienta_id", id)
        .order("fecha", { ascending: false })
        .limit(30),
      supabase
        .from("fotos_progreso")
        .select("id, fecha, tipo, url")
        .eq("clienta_id", id)
        .order("fecha", { ascending: false })
        .limit(6),
      supabase
        .from("notas")
        .select("contenido, creada_en")
        .eq("clienta_id", id)
        .order("creada_en", { ascending: false })
        .limit(5),
    ]);

  const coach = coachRes.data;
  const asignacion = asignacionRes.data as
    | {
        fecha_inicio: string;
        fecha_fin: string | null;
        programas: { nombre: string } | null;
      }
    | null;
  const metricas = (metricasRes.data ?? []) as Array<{
    tipo: string;
    valor: number;
    unidad: string;
    fecha: string;
  }>;
  const sesiones = (sesionesRes.data ?? []) as Array<{
    fecha: string;
    completada: boolean;
    porcentaje_completado: number;
  }>;
  const fotos = (fotosRes.data ?? []) as Array<{
    id: string;
    fecha: string;
    tipo: string | null;
    url: string;
  }>;
  const notas = (notasRes.data ?? []) as Array<{
    contenido: string;
    creada_en: string;
  }>;

  // Agrupar métricas por tipo: { peso: [{fecha, valor, unidad}, ...] }
  const metricasPorTipo = new Map<
    string,
    { unidad: string; puntos: Array<{ fecha: string; valor: number }> }
  >();
  for (const m of metricas) {
    if (!metricasPorTipo.has(m.tipo)) {
      metricasPorTipo.set(m.tipo, { unidad: m.unidad, puntos: [] });
    }
    metricasPorTipo.get(m.tipo)!.puntos.push({ fecha: m.fecha, valor: m.valor });
  }

  // Adherencia y racha
  const completadas = sesiones.filter((s) => s.completada).length;
  const adherencia =
    sesiones.length > 0
      ? Math.round((completadas / sesiones.length) * 100)
      : null;
  let racha = 0;
  for (const s of sesiones) {
    if (s.completada) racha++;
    else break;
  }

  // URLs firmadas de fotos
  const urlsFotos = await obtenerUrlsFirmadas(
    "fotos-progreso",
    fotos.map((f) => f.url),
    3600
  );

  // Branding
  const colorMarca = (coach?.marca_color_primario as string | null) ?? "#16a34a";
  const tituloMarca =
    (coach?.marca_nombre as string | null) ??
    (coach?.nombre as string | null) ??
    "Coach";
  const logoUrl = (coach?.marca_logo_url as string | null) ?? null;

  const edad = clienta.fecha_nacimiento
    ? Math.floor(
        (Date.now() -
          new Date(clienta.fecha_nacimiento as string).getTime()) /
          (365.25 * 86400000)
      )
    : null;

  const fotoPerfilUrl = clienta.foto_url
    ? (await obtenerUrlsFirmadas("coach-avatares", [clienta.foto_url], 3600)).get(
        clienta.foto_url as string
      ) ?? null
    : null;

  return (
    <div>
      <BotonImprimirCabecera />

      <div className="max-w-4xl mx-auto px-8 py-10 print:px-0 print:py-0">
        {/* Cabecera */}
        <header
          className="flex items-start gap-4 border-b-4 pb-4 mb-6"
          style={{ borderColor: colorMarca }}
        >
          {logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt={tituloMarca}
              className="h-14 w-14 rounded object-cover bg-white"
            />
          )}
          <div className="flex-1">
            <p className="text-xs uppercase tracking-wider text-neutral-500">
              Reporte de seguimiento — {tituloMarca}
            </p>
            <h1
              className="text-3xl font-bold mt-1"
              style={{ color: colorMarca }}
            >
              {clienta.nombre} {clienta.apellidos ?? ""}
            </h1>
            <p className="text-sm text-neutral-700 mt-1">
              {clienta.email}
              {clienta.telefono ? ` · ${clienta.telefono}` : ""}
              {edad != null ? ` · ${edad} años` : ""}
            </p>
          </div>
          <div className="text-right">
            {fotoPerfilUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={fotoPerfilUrl}
                alt=""
                className="size-16 rounded-full object-cover bg-neutral-200"
              />
            ) : (
              <div className="size-16 rounded-full bg-neutral-200 grid place-items-center text-neutral-500 font-medium">
                {inicialesNombre(
                  clienta.nombre as string,
                  clienta.apellidos as string | null
                )}
              </div>
            )}
            <p className="text-[10px] text-neutral-500 mt-2">
              Generado el {formatearFecha(isoHoy())}
            </p>
          </div>
        </header>

        {/* Programa activo + KPIs */}
        <section className="grid grid-cols-3 gap-3 mb-6">
          <Kpi
            label="Programa activo"
            valor={asignacion?.programas?.nombre ?? "Sin asignar"}
            sub={
              asignacion
                ? `${formatearFecha(asignacion.fecha_inicio)}${asignacion.fecha_fin ? ` → ${formatearFecha(asignacion.fecha_fin)}` : ""}`
                : null
            }
          />
          <Kpi
            label="Adherencia"
            valor={adherencia != null ? `${adherencia}%` : "—"}
            sub={`${completadas}/${sesiones.length} últimas 30`}
            color={colorMarca}
          />
          <Kpi
            label="Racha actual"
            valor={`${racha}`}
            sub={racha >= 7 ? "🔥 ¡Brutal!" : racha >= 3 ? "💪 En forma" : "Empieza hoy"}
            color={colorMarca}
          />
        </section>

        {/* Métricas */}
        {metricasPorTipo.size > 0 && (
          <section className="mb-6 page-break-inside-avoid">
            <h2
              className="text-base font-semibold py-1.5 px-3 mb-3 rounded"
              style={{ backgroundColor: `${colorMarca}15`, color: colorMarca }}
            >
              Evolución de métricas
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {Array.from(metricasPorTipo.entries()).map(
                ([tipo, { unidad, puntos }]) => {
                  if (puntos.length === 0) return null;
                  const primero = puntos[0]!;
                  const ultimo = puntos[puntos.length - 1]!;
                  const delta = ultimo.valor - primero.valor;
                  const tipoLabel = tipo
                    .replace(/_/g, " ")
                    .replace(/^\w/, (l) => l.toUpperCase());
                  return (
                    <div
                      key={tipo}
                      className="border border-neutral-200 rounded p-3"
                    >
                      <div className="text-xs uppercase text-neutral-500 tracking-wide">
                        {tipoLabel}
                      </div>
                      <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-2xl font-semibold">
                          {ultimo.valor}
                        </span>
                        <span className="text-xs text-neutral-500">
                          {unidad}
                        </span>
                        {puntos.length > 1 && (
                          <span
                            className="text-xs ml-auto"
                            style={{
                              color: delta < 0 ? "#16a34a" : "#d97706",
                            }}
                          >
                            {delta > 0 ? "+" : ""}
                            {delta.toFixed(1)} {unidad}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-neutral-500 mt-1">
                        Inicio: {primero.valor} {unidad} ({formatearFecha(primero.fecha)})
                      </p>
                    </div>
                  );
                }
              )}
            </div>
          </section>
        )}

        {/* Sesiones recientes */}
        {sesiones.length > 0 && (
          <section className="mb-6 page-break-inside-avoid">
            <h2
              className="text-base font-semibold py-1.5 px-3 mb-3 rounded"
              style={{ backgroundColor: `${colorMarca}15`, color: colorMarca }}
            >
              Sesiones recientes (últimas 30 programadas)
            </h2>
            <div className="grid grid-cols-10 gap-1">
              {sesiones.slice(0, 30).map((s, i) => {
                const color = s.completada
                  ? colorMarca
                  : s.porcentaje_completado > 0
                    ? "#fcd34d"
                    : "#fca5a5";
                return (
                  <div
                    key={i}
                    className="aspect-square rounded text-[8px] text-white grid place-items-center"
                    style={{ backgroundColor: color }}
                    title={`${s.fecha}: ${s.porcentaje_completado}%`}
                  >
                    {s.completada ? "✓" : s.porcentaje_completado > 0 ? "½" : "·"}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Fotos de progreso */}
        {fotos.length > 0 && (
          <section className="mb-6 page-break-inside-avoid">
            <h2
              className="text-base font-semibold py-1.5 px-3 mb-3 rounded"
              style={{ backgroundColor: `${colorMarca}15`, color: colorMarca }}
            >
              Fotos de progreso recientes
            </h2>
            <div className="grid grid-cols-3 gap-2">
              {fotos.map((f) => {
                const url = urlsFotos.get(f.url);
                if (!url) return null;
                return (
                  <div key={f.id} className="text-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt=""
                      className="w-full aspect-[3/4] object-cover rounded border border-neutral-200"
                    />
                    <p className="text-[10px] text-neutral-500 mt-1">
                      {formatearFecha(f.fecha)}
                      {f.tipo ? ` · ${f.tipo}` : ""}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Notas internas (solo en uso interno) */}
        {notas.length > 0 && (
          <section className="mb-6 page-break-inside-avoid">
            <h2
              className="text-base font-semibold py-1.5 px-3 mb-3 rounded"
              style={{ backgroundColor: `${colorMarca}15`, color: colorMarca }}
            >
              Notas internas
            </h2>
            <p className="text-[10px] text-neutral-500 mb-2 italic">
              Estas notas son tu uso interno — no las imprimas si vas a entregar el reporte a la clienta.
            </p>
            <div className="space-y-2">
              {notas.map((n, i) => (
                <div
                  key={i}
                  className="border-l-2 border-neutral-300 pl-3 py-1"
                >
                  <p className="text-[10px] text-neutral-500">
                    {formatearFecha(n.creada_en.slice(0, 10))}
                  </p>
                  <div
                    className="text-sm text-neutral-700 mt-1"
                    dangerouslySetInnerHTML={{ __html: n.contenido }}
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        <footer className="mt-10 pt-4 border-t border-neutral-200 text-xs text-neutral-400 text-center">
          {tituloMarca} · Reporte privado · {formatearFecha(isoHoy())}
        </footer>
      </div>

      <style>{`
        @media print {
          @page { size: A4; margin: 1cm; }
          .no-print { display: none !important; }
          body { background: white !important; }
          .page-break-inside-avoid { page-break-inside: avoid; }
        }
      `}</style>
    </div>
  );
}

function Kpi({
  label,
  valor,
  sub,
  color,
}: {
  label: string;
  valor: string;
  sub: string | null;
  color?: string;
}) {
  return (
    <div className="border border-neutral-200 rounded p-3">
      <div className="text-[10px] uppercase tracking-wide text-neutral-500">
        {label}
      </div>
      <div
        className="text-lg font-semibold mt-1 truncate"
        style={color ? { color } : undefined}
      >
        {valor}
      </div>
      {sub && <p className="text-[10px] text-neutral-500 mt-0.5">{sub}</p>}
    </div>
  );
}
