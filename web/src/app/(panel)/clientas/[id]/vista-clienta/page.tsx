import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { EstructuraPrograma, Dia, Bloque } from "@/lib/supabase/tipos";
import { formatearFecha, inicialesNombre } from "@/lib/utilidades";

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

export default async function VistaClientaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: clienta } = await supabase
    .from("clientas")
    .select("id, nombre, apellidos, foto_url, comparador_fotos_activo")
    .eq("id", id)
    .maybeSingle();

  if (!clienta) notFound();

  const { data: asignacionData } = await supabase
    .from("asignaciones")
    .select(
      "id, fecha_inicio, fecha_fin, estructura_snapshot, programas(nombre)"
    )
    .eq("clienta_id", id)
    .eq("activa", true)
    .order("creada_en", { ascending: false })
    .limit(1)
    .maybeSingle();

  const asignacion = asignacionData as
    | {
        id: string;
        fecha_inicio: string;
        fecha_fin: string | null;
        estructura_snapshot: EstructuraPrograma;
        programas: { nombre: string } | null;
      }
    | null;

  const hoy = fechaISO(new Date());
  const offsetHoy = asignacion ? diasEntre(asignacion.fecha_inicio, hoy) : 0;
  const semanaIdxHoy = Math.floor(offsetHoy / 7);
  const diaIdxHoy = offsetHoy % 7;

  return (
    <div className="bg-neutral-950 min-h-screen">
      {/* Aviso: estás viendo como cliente */}
      <div className="bg-amber-900/40 border-b border-amber-900/60 px-4 py-2 text-xs flex items-center justify-between">
        <span className="text-amber-200">
          👁️ Vista previa: así verá <strong>{clienta.nombre}</strong> su app.
        </span>
        <Link
          href={`/clientas/${id}`}
          className="text-amber-200 hover:text-white"
        >
          ← Salir de la vista cliente
        </Link>
      </div>

      <div className="max-w-md mx-auto px-4 pt-6 pb-12">
        {/* Header tipo app móvil */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-full bg-neutral-800 flex items-center justify-center text-sm font-medium text-neutral-300">
            {inicialesNombre(clienta.nombre, clienta.apellidos)}
          </div>
          <div>
            <div className="text-lg font-semibold">
              ¡Hola, {clienta.nombre}!
            </div>
            <div className="text-xs text-neutral-500">
              {asignacion?.programas?.nombre ?? "Sin programa asignado"}
            </div>
          </div>
        </div>

        {!asignacion ? (
          <div className="border border-dashed border-neutral-800 rounded-2xl p-8 text-center text-sm text-neutral-500">
            Tu entrenador aún no te ha asignado un programa. ¡Pronto lo tendrás!
          </div>
        ) : offsetHoy < 0 ? (
          <div className="border border-amber-900/50 bg-amber-950/20 rounded-2xl p-6 text-center">
            <div className="text-sm text-amber-300">
              Tu programa empieza el {formatearFecha(asignacion.fecha_inicio)}
            </div>
            <div className="text-xs text-amber-500 mt-1">
              Faltan {-offsetHoy} {-offsetHoy === 1 ? "día" : "días"}
            </div>
          </div>
        ) : semanaIdxHoy >= asignacion.estructura_snapshot.length ? (
          <div className="border border-neutral-800 rounded-2xl p-6 text-center">
            <div className="text-sm">¡Felicidades! Has terminado tu programa.</div>
          </div>
        ) : (
          <VistaSemana
            estructura={asignacion.estructura_snapshot}
            semanaIdx={semanaIdxHoy}
            diaIdxHoy={diaIdxHoy}
            fechaInicio={asignacion.fecha_inicio}
          />
        )}

        <div className="mt-8 grid grid-cols-2 gap-2">
          <CardAccion icono="⚖️" label="Registrar peso" />
          <CardAccion icono="📸" label="Subir foto progreso" />
          <CardAccion icono="🛒" label="Lista de la compra" />
          <CardAccion icono="💬" label="Mensajes" />
        </div>
      </div>
    </div>
  );
}

function VistaSemana({
  estructura,
  semanaIdx,
  diaIdxHoy,
  fechaInicio,
}: {
  estructura: EstructuraPrograma;
  semanaIdx: number;
  diaIdxHoy: number;
  fechaInicio: string;
}) {
  const semana = estructura[semanaIdx]!;
  const diaHoy = semana.dias[diaIdxHoy];

  return (
    <div className="space-y-6">
      {/* Día de hoy destacado */}
      {diaHoy && (
        <div className="border border-brand-600/40 bg-brand-950/20 rounded-2xl p-5">
          <div className="text-xs uppercase tracking-wide text-brand-400 mb-1">
            HOY · Semana {semanaIdx + 1}
          </div>
          <div className="text-lg font-semibold mb-3">
            {diaHoy.titulo}
            {diaHoy.descanso && (
              <span className="text-xs text-neutral-500 ml-2">(Descanso)</span>
            )}
          </div>
          {diaHoy.descanso || diaHoy.bloques.length === 0 ? (
            <div className="text-sm text-neutral-400">
              {diaHoy.descanso
                ? "Día de descanso. Aprovecha para hidratarte y descansar."
                : "Día libre."}
            </div>
          ) : (
            <div className="space-y-3">
              {diaHoy.bloques.map((b) => (
                <BloqueClienta key={b.id} bloque={b} />
              ))}
              <button
                type="button"
                className="w-full bg-brand-600 hover:bg-brand-700 text-white rounded-lg py-2.5 text-sm font-medium mt-2"
              >
                Marcar entreno como completado
              </button>
            </div>
          )}
        </div>
      )}

      {/* Resto de la semana */}
      <div>
        <div className="text-xs uppercase tracking-wide text-neutral-500 mb-2">
          Esta semana
        </div>
        <div className="space-y-2">
          {semana.dias.map((d, idx) => {
            const fechaDelDia = sumarDias(fechaInicio, semanaIdx * 7 + idx);
            const esHoy = idx === diaIdxHoy;
            return (
              <div
                key={idx}
                className={
                  "border rounded-xl p-3 flex items-center gap-3 " +
                  (esHoy
                    ? "border-brand-600/40 bg-brand-950/10"
                    : "border-neutral-800")
                }
              >
                <div className="text-xs text-neutral-500 w-12 flex-shrink-0">
                  {formatearFechaMini(fechaDelDia)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{d.titulo}</div>
                  <div className="text-xs text-neutral-500">
                    {d.descanso
                      ? "Descanso"
                      : d.bloques.length === 0
                      ? "Libre"
                      : `${d.bloques.reduce(
                          (a, b) => a + b.elementos.length,
                          0
                        )} ejercicios`}
                  </div>
                </div>
                {esHoy && (
                  <span className="text-[10px] text-brand-400 bg-brand-950/40 px-2 py-1 rounded-full">
                    HOY
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function BloqueClienta({ bloque }: { bloque: Bloque }) {
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-3">
      <div className="font-medium text-sm">{bloque.titulo}</div>
      {bloque.indicaciones && (
        <div className="text-xs text-neutral-500 mt-0.5">{bloque.indicaciones}</div>
      )}
      <ul className="mt-2 space-y-1.5">
        {bloque.elementos.map((el) => (
          <li
            key={el.id}
            className="flex items-start gap-2 text-sm text-neutral-200"
          >
            <input
              type="checkbox"
              disabled
              className="mt-1 accent-brand-600"
            />
            <div className="flex-1 min-w-0">
              {el.tipo === "ejercicio" && (
                <>
                  <div className="truncate">
                    {el.ejercicio_nombre ?? "Ejercicio"}
                  </div>
                  <div className="text-xs text-neutral-500">
                    {el.series.length} series ·{" "}
                    {el.series.map((s) => s.reps).join(" / ")} reps
                  </div>
                </>
              )}
              {el.tipo === "contenido" && (
                <div className="text-neutral-300">📝 {el.titulo}</div>
              )}
              {el.tipo === "metrica_prompt" && (
                <div className="text-neutral-300">
                  ⚖️ Registra tu {el.metrica_tipo.replace(/_/g, " ")}
                </div>
              )}
              {el.tipo === "foto_progreso_prompt" && (
                <div className="text-neutral-300">📸 Sube una foto de progreso</div>
              )}
              {el.tipo === "pasos_prompt" && (
                <div className="text-neutral-300">👣 Registra tus pasos del día</div>
              )}
              {el.tipo === "recordatorio" && (
                <div className="text-neutral-300">
                  🔔 {el.hora} · {el.mensaje}
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CardAccion({ icono, label }: { icono: string; label: string }) {
  return (
    <div className="border border-neutral-800 rounded-xl p-4 text-center bg-neutral-900/50">
      <div className="text-2xl mb-1">{icono}</div>
      <div className="text-xs text-neutral-300">{label}</div>
    </div>
  );
}

function formatearFechaMini(iso: string): string {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
  });
}
