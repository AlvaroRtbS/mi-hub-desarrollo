import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { EstructuraPrograma, Dia } from "@/lib/supabase/tipos";
import { formatearFecha, inicialesNombre } from "@/lib/utilidades";

type AsignacionPunto = {
  id: string;
  clienta_id: string;
  fecha_inicio: string;
  fecha_fin: string | null;
  estructura_snapshot: EstructuraPrograma;
  clientas: {
    id: string;
    nombre: string;
    apellidos: string | null;
    foto_url: string | null;
  } | null;
  programas: { nombre: string } | null;
};

function fechaISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function diasEntre(a: string, b: string): number {
  const fa = new Date(a + "T00:00:00Z");
  const fb = new Date(b + "T00:00:00Z");
  return Math.floor((fb.getTime() - fa.getTime()) / 86400000);
}

function sumarDias(iso: string, n: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return fechaISO(d);
}

function nombreDiaLargo(iso: string): string {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("es-ES", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
}

function inicioSemana(iso: string): string {
  // Lunes de la semana de la fecha dada (ISO week, lunes = inicio)
  const d = new Date(iso + "T00:00:00Z");
  const dow = (d.getUTCDay() + 6) % 7; // domingo=6, lunes=0
  d.setUTCDate(d.getUTCDate() - dow);
  return fechaISO(d);
}

function inicioMes(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(1);
  return fechaISO(d);
}

function finMes(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCMonth(d.getUTCMonth() + 1, 0); // último día del mes
  return fechaISO(d);
}

function sumarMeses(iso: string, n: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCMonth(d.getUTCMonth() + n);
  return fechaISO(d);
}

function nombreMes(iso: string): string {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("es-ES", {
    month: "long",
    year: "numeric",
  });
}

type Tramo =
  | { estado: "no_empezado"; faltan: number }
  | { estado: "finalizado"; haceDias: number }
  | { estado: "activo"; semana: number; dia: number; def: Dia };

function calcularTramo(
  fechaInicio: string,
  fechaActual: string,
  estructura: EstructuraPrograma,
  fechaFin: string | null
): Tramo {
  const offset = diasEntre(fechaInicio, fechaActual);
  if (offset < 0) return { estado: "no_empezado", faltan: -offset };

  const semanas = Array.isArray(estructura) ? estructura : [];
  const totalSemanas = semanas.length;
  const semanaIdx = Math.floor(offset / 7);
  const diaIdx = offset % 7;

  if (semanaIdx >= totalSemanas) {
    const finReal = fechaFin ?? sumarDias(fechaInicio, totalSemanas * 7 - 1);
    return { estado: "finalizado", haceDias: diasEntre(finReal, fechaActual) };
  }
  const semana = semanas[semanaIdx];
  const dia = semana?.dias?.[diaIdx];
  if (!dia) return { estado: "finalizado", haceDias: 0 };

  return { estado: "activo", semana: semanaIdx + 1, dia: diaIdx + 1, def: dia };
}

const NOMBRES_DIAS_CORTOS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

export default async function CalendarioPage({
  searchParams,
}: {
  searchParams: Promise<{ fecha?: string; vista?: string }>;
}) {
  const params = await searchParams;
  const hoyIso = fechaISO(new Date());
  const fechaActual = params.fecha?.match(/^\d{4}-\d{2}-\d{2}$/) ? params.fecha : hoyIso;
  const vista =
    params.vista === "dia" ? "dia" : params.vista === "mes" ? "mes" : "semana";

  const supabase = await createSupabaseServerClient();

  const { data: asignacionesData, error } = await supabase
    .from("asignaciones")
    .select(
      "id, clienta_id, fecha_inicio, fecha_fin, estructura_snapshot, clientas(id, nombre, apellidos, foto_url), programas(nombre)"
    )
    .eq("activa", true);

  const asignaciones = (asignacionesData ?? []) as unknown as AsignacionPunto[];

  const fechaPrev =
    vista === "mes"
      ? sumarMeses(fechaActual, -1)
      : sumarDias(fechaActual, vista === "semana" ? -7 : -1);
  const fechaSig =
    vista === "mes"
      ? sumarMeses(fechaActual, 1)
      : sumarDias(fechaActual, vista === "semana" ? 7 : 1);

  return (
    <div className="p-4 pt-16 md:p-8 mx-auto max-w-7xl">
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Calendario</h1>
          <p className="text-sm text-neutral-400 mt-1">
            Qué tocar a cada clienta según su programa activo.
          </p>
        </div>
        <div className="flex gap-1 border border-neutral-800 rounded-lg p-1">
          <Link
            href={`/calendario?vista=mes${
              fechaActual !== hoyIso ? `&fecha=${fechaActual}` : ""
            }`}
            className={
              "text-sm px-3 py-1 rounded " +
              (vista === "mes"
                ? "bg-neutral-800 text-white"
                : "text-neutral-400 hover:text-white")
            }
          >
            Mes
          </Link>
          <Link
            href={`/calendario?vista=semana${
              fechaActual !== hoyIso ? `&fecha=${fechaActual}` : ""
            }`}
            className={
              "text-sm px-3 py-1 rounded " +
              (vista === "semana"
                ? "bg-neutral-800 text-white"
                : "text-neutral-400 hover:text-white")
            }
          >
            Semana
          </Link>
          <Link
            href={`/calendario?vista=dia${
              fechaActual !== hoyIso ? `&fecha=${fechaActual}` : ""
            }`}
            className={
              "text-sm px-3 py-1 rounded " +
              (vista === "dia"
                ? "bg-neutral-800 text-white"
                : "text-neutral-400 hover:text-white")
            }
          >
            Día
          </Link>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-6 flex-wrap">
        <Link
          href={`/calendario?fecha=${fechaPrev}&vista=${vista}`}
          className="text-sm px-3 py-1.5 rounded-lg border border-neutral-800 text-neutral-300 hover:bg-neutral-900"
        >
          ← Anterior
        </Link>
        <div className="text-base font-medium px-2 capitalize">
          {vista === "mes"
            ? nombreMes(fechaActual)
            : vista === "semana"
            ? `Semana del ${nombreDiaLargo(inicioSemana(fechaActual))}`
            : nombreDiaLargo(fechaActual)}
        </div>
        <Link
          href={`/calendario?fecha=${fechaSig}&vista=${vista}`}
          className="text-sm px-3 py-1.5 rounded-lg border border-neutral-800 text-neutral-300 hover:bg-neutral-900"
        >
          Siguiente →
        </Link>
        {fechaActual !== hoyIso && (
          <Link
            href={`/calendario?vista=${vista}`}
            className="text-xs px-3 py-1.5 rounded-lg text-brand-500 hover:bg-neutral-900 ml-2"
          >
            Volver a hoy
          </Link>
        )}
      </div>

      {error && (
        <div className="text-sm text-red-400 bg-red-950/30 border border-red-900/50 rounded-lg px-4 py-3 mb-4">
          {error.message}
        </div>
      )}

      {asignaciones.length === 0 ? (
        <div className="border border-dashed border-neutral-800 rounded-2xl p-12 text-center">
          <div className="text-neutral-400">
            Ninguna clienta tiene un programa activo.
          </div>
          <div className="text-sm text-neutral-500 mt-2">
            Asigna programas a tus clientas desde su ficha o desde el editor del
            programa.
          </div>
        </div>
      ) : vista === "mes" ? (
        <VistaMes asignaciones={asignaciones} fechaActual={fechaActual} hoyIso={hoyIso} />
      ) : vista === "semana" ? (
        <VistaSemana asignaciones={asignaciones} fechaInicio={inicioSemana(fechaActual)} hoyIso={hoyIso} />
      ) : (
        <VistaDia asignaciones={asignaciones} fechaActual={fechaActual} />
      )}
    </div>
  );
}

// ============================================================================
// Vista semanal: clientas en filas, días en columnas
// ============================================================================
function VistaSemana({
  asignaciones,
  fechaInicio,
  hoyIso,
}: {
  asignaciones: AsignacionPunto[];
  fechaInicio: string;
  hoyIso: string;
}) {
  const dias = Array.from({ length: 7 }, (_, i) => sumarDias(fechaInicio, i));

  const ordenadas = [...asignaciones].sort((a, b) =>
    (a.clientas?.nombre ?? "").localeCompare(b.clientas?.nombre ?? "")
  );

  return (
    <div className="border border-neutral-800 rounded-2xl overflow-x-auto bg-neutral-950">
      <table className="w-full text-sm">
        <thead className="bg-neutral-900">
          <tr>
            <th className="text-left px-4 py-3 font-medium text-neutral-400 w-48 sticky left-0 bg-neutral-900 z-10">
              Clienta
            </th>
            {dias.map((d, i) => {
              const esHoy = d === hoyIso;
              return (
                <th
                  key={d}
                  className={
                    "text-left px-3 py-3 font-medium min-w-[140px] " +
                    (esHoy ? "bg-brand-950/30 text-brand-400" : "text-neutral-400")
                  }
                >
                  <div className="text-xs uppercase">{NOMBRES_DIAS_CORTOS[i]}</div>
                  <div className="text-xs font-normal text-neutral-600 mt-0.5">
                    {d.slice(8, 10)}/{d.slice(5, 7)}
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {ordenadas.map((a) => {
            const c = a.clientas;
            if (!c) return null;
            return (
              <tr key={a.id} className="border-t border-neutral-800">
                <td className="px-4 py-2 sticky left-0 bg-neutral-950 z-10">
                  <Link
                    href={`/clientas/${c.id}`}
                    className="flex items-center gap-2 hover:text-brand-500"
                  >
                    <span className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center text-xs font-medium text-neutral-300 flex-shrink-0">
                      {inicialesNombre(c.nombre, c.apellidos)}
                    </span>
                    <span className="text-sm truncate">{c.nombre}</span>
                  </Link>
                </td>
                {dias.map((d) => {
                  const tramo = calcularTramo(
                    a.fecha_inicio,
                    d,
                    a.estructura_snapshot,
                    a.fecha_fin
                  );
                  const esHoy = d === hoyIso;
                  return (
                    <td
                      key={d}
                      className={"px-2 py-2 " + (esHoy ? "bg-brand-950/10" : "")}
                    >
                      <CeldaDia tramo={tramo} />
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function CeldaDia({ tramo }: { tramo: Tramo }) {
  if (tramo.estado === "no_empezado") {
    return <div className="text-xs text-amber-500/70">Sin empezar</div>;
  }
  if (tramo.estado === "finalizado") {
    return <div className="text-xs text-neutral-700">Finalizado</div>;
  }
  if (tramo.def.descanso) {
    return (
      <div className="text-xs text-neutral-600 bg-neutral-900/50 border border-neutral-900 rounded px-2 py-1.5">
        Descanso
      </div>
    );
  }
  const elementos = tramo.def.bloques.reduce((a, b) => a + b.elementos.length, 0);
  if (elementos === 0) {
    return <div className="text-xs text-neutral-700">—</div>;
  }
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded px-2 py-1.5">
      <div className="text-xs font-medium text-neutral-100 truncate" title={tramo.def.titulo}>
        {tramo.def.titulo}
      </div>
      <div className="text-[10px] text-neutral-500 mt-0.5">{elementos} elem.</div>
    </div>
  );
}

// ============================================================================
// Vista mensual: cuadrícula 7×N con clientas que entrenan cada día
// ============================================================================
function VistaMes({
  asignaciones,
  fechaActual,
  hoyIso,
}: {
  asignaciones: AsignacionPunto[];
  fechaActual: string;
  hoyIso: string;
}) {
  const primerDiaMes = inicioMes(fechaActual);
  const ultimoDiaMes = finMes(fechaActual);
  const inicio = inicioSemana(primerDiaMes);
  // Calcular cuántas semanas necesitamos: las que cubran hasta ultimoDiaMes
  const inicioUltimaSem = inicioSemana(ultimoDiaMes);
  const totalSemanas = Math.floor(diasEntre(inicio, inicioUltimaSem) / 7) + 1;
  const totalDias = totalSemanas * 7;
  const dias = Array.from({ length: totalDias }, (_, i) =>
    sumarDias(inicio, i)
  );
  const mesActual = fechaActual.slice(0, 7); // YYYY-MM

  // Pre-calcular para cada día qué asignaciones tienen entrenamiento (no descanso, no vacío)
  type Entrada = { a: AsignacionPunto; titulo: string };
  const porDia = new Map<string, Entrada[]>();
  for (const d of dias) {
    porDia.set(d, []);
  }
  for (const a of asignaciones) {
    for (const d of dias) {
      const tramo = calcularTramo(
        a.fecha_inicio,
        d,
        a.estructura_snapshot,
        a.fecha_fin
      );
      if (
        tramo.estado === "activo" &&
        !tramo.def.descanso &&
        tramo.def.bloques.length > 0
      ) {
        porDia.get(d)!.push({ a, titulo: tramo.def.titulo });
      }
    }
  }

  return (
    <div className="border border-neutral-800 rounded-2xl overflow-hidden bg-neutral-950">
      <div className="grid grid-cols-7 bg-neutral-900 text-[11px] uppercase tracking-wide text-neutral-400">
        {NOMBRES_DIAS_CORTOS.map((n) => (
          <div key={n} className="px-2 py-2 text-center font-medium">
            {n}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {dias.map((d) => {
          const enEsteMes = d.slice(0, 7) === mesActual;
          const esHoy = d === hoyIso;
          const entradas = porDia.get(d) ?? [];
          return (
            <div
              key={d}
              className={
                "border-t border-l border-neutral-900 min-h-[110px] p-1.5 flex flex-col gap-1 " +
                (!enEsteMes ? "bg-neutral-950/40 " : "") +
                (esHoy ? "bg-brand-950/20 " : "")
              }
            >
              <div className="flex items-center justify-between">
                <Link
                  href={`/calendario?vista=dia&fecha=${d}`}
                  className={
                    "text-xs font-semibold tabular-nums px-1.5 py-0.5 rounded transition " +
                    (esHoy
                      ? "bg-brand-600 text-white hover:bg-brand-700"
                      : enEsteMes
                      ? "text-neutral-200 hover:bg-neutral-900"
                      : "text-neutral-700 hover:bg-neutral-900")
                  }
                  title={`Ver día ${d}`}
                >
                  {parseInt(d.slice(8, 10), 10)}
                </Link>
                {entradas.length > 0 && enEsteMes && (
                  <span className="text-[10px] text-neutral-500">
                    {entradas.length}
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-0.5 overflow-hidden">
                {entradas.slice(0, 3).map(({ a, titulo }) => (
                  <Link
                    key={a.id}
                    href={`/clientas/${a.clienta_id}`}
                    title={`${a.clientas?.nombre ?? ""} · ${titulo}`}
                    className={
                      "flex items-center gap-1 rounded px-1 py-0.5 text-[10px] truncate hover:bg-neutral-900 " +
                      (enEsteMes ? "text-neutral-300" : "text-neutral-600")
                    }
                  >
                    <span
                      className={
                        "w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-semibold flex-shrink-0 " +
                        (enEsteMes
                          ? "bg-brand-900/60 text-brand-200"
                          : "bg-neutral-900 text-neutral-600")
                      }
                    >
                      {inicialesNombre(
                        a.clientas?.nombre ?? "",
                        a.clientas?.apellidos
                      )}
                    </span>
                    <span className="truncate">
                      {a.clientas?.nombre ?? ""}
                    </span>
                  </Link>
                ))}
                {entradas.length > 3 && (
                  <Link
                    href={`/calendario?vista=dia&fecha=${d}`}
                    className="text-[10px] text-neutral-500 hover:text-neutral-300 px-1"
                  >
                    +{entradas.length - 3} más
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// Vista diaria (la original)
// ============================================================================
function VistaDia({
  asignaciones,
  fechaActual,
}: {
  asignaciones: AsignacionPunto[];
  fechaActual: string;
}) {
  const filas = asignaciones
    .map((a) => ({
      asignacion: a,
      tramo: calcularTramo(a.fecha_inicio, fechaActual, a.estructura_snapshot, a.fecha_fin),
    }))
    .sort((a, b) => {
      const ranking = (estado: Tramo["estado"]) =>
        estado === "activo" ? 0 : estado === "no_empezado" ? 1 : 2;
      const diff = ranking(a.tramo.estado) - ranking(b.tramo.estado);
      if (diff !== 0) return diff;
      const nA = a.asignacion.clientas?.nombre ?? "";
      const nB = b.asignacion.clientas?.nombre ?? "";
      return nA.localeCompare(nB);
    });

  return (
    <div className="space-y-3">
      {filas.map(({ asignacion, tramo }) => {
        const c = asignacion.clientas;
        if (!c) return null;
        return (
          <div
            key={asignacion.id}
            className="border border-neutral-800 rounded-2xl p-4 flex items-center gap-4"
          >
            <div className="w-12 h-12 rounded-full bg-neutral-800 flex items-center justify-center text-sm font-semibold text-neutral-300 flex-shrink-0">
              {inicialesNombre(c.nombre, c.apellidos)}
            </div>
            <div className="flex-1 min-w-0">
              <Link
                href={`/clientas/${c.id}`}
                className="text-sm font-medium hover:text-brand-500"
              >
                {c.nombre} {c.apellidos ?? ""}
              </Link>
              <div className="text-xs text-neutral-500 mt-0.5">
                {asignacion.programas?.nombre ?? "Programa"}
                {tramo.estado === "activo" && (
                  <>
                    {" "}· Semana {tramo.semana} · Día {tramo.dia}
                  </>
                )}
                {tramo.estado === "no_empezado" && (
                  <> · Empieza el {formatearFecha(asignacion.fecha_inicio)}</>
                )}
                {tramo.estado === "finalizado" && <> · Finalizado</>}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              {tramo.estado === "activo" ? (
                tramo.def.descanso ? (
                  <span className="text-sm text-neutral-500">Día de descanso</span>
                ) : tramo.def.bloques.length === 0 ? (
                  <span className="text-sm text-neutral-500">Vacío</span>
                ) : (
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium">{tramo.def.titulo}</div>
                    <div className="text-xs text-neutral-500">
                      {tramo.def.bloques.length}{" "}
                      {tramo.def.bloques.length === 1 ? "bloque" : "bloques"} ·{" "}
                      {tramo.def.bloques.reduce(
                        (a, b) => a + b.elementos.length,
                        0
                      )}{" "}
                      elementos
                    </div>
                  </div>
                )
              ) : tramo.estado === "no_empezado" ? (
                <span className="text-sm text-amber-400">
                  Faltan {tramo.faltan} {tramo.faltan === 1 ? "día" : "días"}
                </span>
              ) : (
                <span className="text-sm text-neutral-500">—</span>
              )}
            </div>
            <Link
              href={`/clientas/${c.id}`}
              className="text-xs text-neutral-500 hover:text-brand-500 flex-shrink-0"
            >
              Ver ficha →
            </Link>
          </div>
        );
      })}
    </div>
  );
}
