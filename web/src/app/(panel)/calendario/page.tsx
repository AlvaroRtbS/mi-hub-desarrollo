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

  const totalSemanas = estructura.length;
  const semanaIdx = Math.floor(offset / 7);
  const diaIdx = offset % 7;

  if (semanaIdx >= totalSemanas) {
    const finReal = fechaFin ?? sumarDias(fechaInicio, totalSemanas * 7 - 1);
    return { estado: "finalizado", haceDias: diasEntre(finReal, fechaActual) };
  }
  const semana = estructura[semanaIdx];
  const dia = semana?.dias[diaIdx];
  if (!dia) return { estado: "finalizado", haceDias: 0 };

  return { estado: "activo", semana: semanaIdx + 1, dia: diaIdx + 1, def: dia };
}

export default async function CalendarioPage({
  searchParams,
}: {
  searchParams: Promise<{ fecha?: string }>;
}) {
  const params = await searchParams;
  const hoyIso = fechaISO(new Date());
  const fechaActual = params.fecha?.match(/^\d{4}-\d{2}-\d{2}$/) ? params.fecha : hoyIso;

  const supabase = await createSupabaseServerClient();

  const { data: asignacionesData, error } = await supabase
    .from("asignaciones")
    .select(
      "id, clienta_id, fecha_inicio, fecha_fin, estructura_snapshot, clientas(id, nombre, apellidos, foto_url), programas(nombre)"
    )
    .eq("activa", true);

  const asignaciones = (asignacionesData ?? []) as unknown as AsignacionPunto[];

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

  const fechaPrev = sumarDias(fechaActual, -1);
  const fechaSig = sumarDias(fechaActual, 1);

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Calendario</h1>
          <p className="text-sm text-neutral-400 mt-1">
            Qué toca hoy a cada clienta según su programa activo.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-6">
        <Link
          href={`/calendario?fecha=${fechaPrev}`}
          className="text-sm px-3 py-1.5 rounded-lg border border-neutral-800 text-neutral-300 hover:bg-neutral-900"
        >
          ← Anterior
        </Link>
        <div className="text-base font-medium px-2 capitalize">
          {nombreDiaLargo(fechaActual)}
        </div>
        <Link
          href={`/calendario?fecha=${fechaSig}`}
          className="text-sm px-3 py-1.5 rounded-lg border border-neutral-800 text-neutral-300 hover:bg-neutral-900"
        >
          Siguiente →
        </Link>
        {fechaActual !== hoyIso && (
          <Link
            href={`/calendario`}
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

      {filas.length === 0 ? (
        <div className="border border-dashed border-neutral-800 rounded-2xl p-12 text-center">
          <div className="text-neutral-400">
            Ninguna clienta tiene un programa activo.
          </div>
          <div className="text-sm text-neutral-500 mt-2">
            Asigna programas a tus clientas desde su ficha o desde el editor del programa.
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filas.map(({ asignacion, tramo }) => (
            <FilaClienta
              key={asignacion.id}
              asignacion={asignacion}
              tramo={tramo}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FilaClienta({
  asignacion,
  tramo,
}: {
  asignacion: AsignacionPunto;
  tramo: Tramo;
}) {
  const c = asignacion.clientas;
  if (!c) return null;

  return (
    <div className="border border-neutral-800 rounded-2xl p-4 flex items-center gap-4">
      <div className="w-12 h-12 rounded-full bg-neutral-800 flex items-center justify-center text-sm font-semibold text-neutral-300 flex-shrink-0">
        {inicialesNombre(c.nombre, c.apellidos)}
      </div>

      <div className="flex-1 min-w-0">
        <Link href={`/clientas/${c.id}`} className="text-sm font-medium hover:text-brand-500">
          {c.nombre} {c.apellidos ?? ""}
        </Link>
        <div className="text-xs text-neutral-500 mt-0.5">
          {asignacion.programas?.nombre ?? "Programa"} ·{" "}
          {tramo.estado === "activo" && (
            <>
              Semana {tramo.semana} · Día {tramo.dia}
            </>
          )}
          {tramo.estado === "no_empezado" && (
            <>Empieza el {formatearFecha(asignacion.fecha_inicio)}</>
          )}
          {tramo.estado === "finalizado" && <>Programa finalizado</>}
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
                {tramo.def.bloques.reduce((acc, b) => acc + b.elementos.length, 0)}{" "}
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
}
