import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AutoRefresh, BotonJob } from "./acciones-ui";

export const dynamic = "force-dynamic";

type ItemAtender = {
  tipo?: string;
  texto?: string;
  accion?: string;
  clienta?: string;
  severidad?: string;
};

type SnapshotCockpit = {
  fecha?: string;
  tareas?: unknown[];
  atender?: { items?: ItemAtender[]; disponible?: boolean };
  contenido?: {
    hoy?: unknown[];
    nuevas?: number;
    aprobados_espera?: number;
    disponible?: boolean;
  };
  numeros?: { mes?: string; vacio?: boolean; kpis?: Record<string, unknown> };
};

type Job = {
  id: string;
  tipo: string;
  estado: string;
  error_msg: string | null;
  created_at: string;
  finished_at: string | null;
};

const ESTADO_JOB: Record<string, string> = {
  pending: "text-neutral-400",
  running: "text-sky-400",
  done: "text-emerald-400",
  error: "text-red-400",
  timeout: "text-amber-400",
};

function hora(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function CockpitPage() {
  const supabase = await createSupabaseServerClient();

  const [{ data: hb }, { data: snap }, { data: jobs }] = await Promise.all([
    supabase
      .from("worker_heartbeat")
      .select("last_seen, hostname, version, estado_apps")
      .eq("id", "main")
      .maybeSingle(),
    supabase
      .from("cockpit_snapshot")
      .select("data, updated_at")
      .eq("id", "current")
      .maybeSingle(),
    supabase
      .from("jobs")
      .select("id, tipo, estado, error_msg, created_at, finished_at")
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  const online =
    !!hb?.last_seen &&
    Date.now() - new Date(hb.last_seen as string).getTime() < 2 * 60 * 1000;
  const datos = (snap?.data ?? {}) as SnapshotCockpit;
  const items = datos.atender?.items ?? [];
  const criticos = items.filter((i) => i.severidad === "crit");
  const avisos = items.filter((i) => i.severidad !== "crit");

  return (
    <div className="p-4 pt-16 md:p-8 mx-auto max-w-5xl">
      <AutoRefresh />

      <div className="flex items-baseline justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Cockpit</h1>
          <p className="text-sm text-neutral-400 mt-1">
            {datos.fecha ? `Datos del ${datos.fecha}` : "Agregado del cerebro local"}
            {snap?.updated_at && ` · sincronizado ${hora(snap.updated_at as string)}`}
          </p>
        </div>
        <div
          className={
            "flex items-center gap-2 text-sm px-3 py-1.5 rounded-full border " +
            (online
              ? "border-emerald-900 bg-emerald-950/40 text-emerald-300"
              : "border-red-900 bg-red-950/40 text-red-300")
          }
        >
          <span
            className={
              "w-2 h-2 rounded-full " + (online ? "bg-emerald-400" : "bg-red-400")
            }
          />
          {online
            ? `PC conectado (${hb?.hostname ?? "?"})`
            : hb
              ? `PC sin señal desde las ${hora(hb.last_seen as string)}`
              : "Worker nunca visto (¿RLS/email?)"}
        </div>
      </div>

      {/* Qué atender hoy */}
      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
          Qué atender ({items.length})
        </h2>
        {items.length === 0 ? (
          <p className="mt-3 text-sm text-neutral-500">
            Nada pendiente en el último snapshot.
          </p>
        ) : (
          <div className="mt-3 space-y-2">
            {[...criticos, ...avisos].slice(0, 12).map((it, i) => (
              <div
                key={i}
                className={
                  "rounded-xl border px-4 py-3 " +
                  (it.severidad === "crit"
                    ? "border-red-900/60 bg-red-950/20"
                    : "border-neutral-800 bg-neutral-900/40")
                }
              >
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-sm font-medium text-neutral-100">
                    {it.clienta ?? "—"}
                  </span>
                  <span className="text-sm text-neutral-300">{it.texto}</span>
                </div>
                {it.accion && (
                  <div className="mt-1 text-xs text-neutral-500">→ {it.accion}</div>
                )}
              </div>
            ))}
            {items.length > 12 && (
              <p className="text-xs text-neutral-600">
                …y {items.length - 12} más en el snapshot completo.
              </p>
            )}
          </div>
        )}
      </section>

      {/* Contenido + números */}
      <section className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4">
          <div className="text-xs uppercase tracking-wide text-neutral-500">
            Ideas de contenido nuevas
          </div>
          <div className="mt-1 text-2xl font-semibold">
            {datos.contenido?.nuevas ?? "—"}
          </div>
        </div>
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4">
          <div className="text-xs uppercase tracking-wide text-neutral-500">
            Borradores WA en espera
          </div>
          <div className="mt-1 text-2xl font-semibold">
            {datos.contenido?.aprobados_espera ?? "—"}
          </div>
        </div>
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4">
          <div className="text-xs uppercase tracking-wide text-neutral-500">
            KPIs ({datos.numeros?.mes ?? "mes"})
          </div>
          <div className="mt-1 text-2xl font-semibold">
            {datos.numeros?.vacio ? "sin datos" : "OK"}
          </div>
        </div>
      </section>

      {/* Acciones remotas */}
      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
          Acciones en tu PC
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <BotonJob
            tipo="sync_cockpit"
            etiqueta="Sincronizar cockpit"
            descripcion="Relee el cerebro local y actualiza esta página."
          />
          <BotonJob
            tipo="generar_brief"
            etiqueta="Generar brief de hoy"
            descripcion="Ejecuta el brief diario y lo sube a Storage (tarda minutos)."
          />
          <BotonJob
            tipo="sync_recetario"
            etiqueta="Sincronizar recetario"
            descripcion="Sube las recetas del Recetario local a la web."
          />
          <BotonJob
            tipo="sync_negocio"
            etiqueta="Sincronizar negocio"
            descripcion="Actualiza MRR, alertas y cobros de Stripe en /negocio."
          />
          <BotonJob
            tipo="activar_bot_wa"
            etiqueta="Arrancar bot WhatsApp"
            descripcion="Levanta el panel y el bot en tu PC."
          />
          <BotonJob
            tipo="parar_bot_wa"
            etiqueta="Parar bot WhatsApp"
            descripcion="Detiene el bot de WhatsApp."
          />
        </div>
        {!online && (
          <p className="mt-2 text-xs text-amber-400">
            ⚠ El PC está sin señal: los jobs quedarán en cola hasta que el worker
            vuelva.
          </p>
        )}
      </section>

      {/* Historial de jobs */}
      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
          Últimos jobs
        </h2>
        {/* overflow-x-auto: la fila hora+tipo+estado no cabe en móvil y con
            "hidden" se perdía el estado del job, que es justo lo que vienes a
            mirar cuando algo ha fallado. */}
        <div className="mt-3 rounded-xl border border-neutral-800 overflow-x-auto">
          <table className="w-full min-w-[28rem] text-sm">
            <tbody className="divide-y divide-neutral-800/70">
              {(jobs as Job[] | null)?.map((j) => (
                <tr key={j.id}>
                  <td className="px-4 py-2.5 font-mono text-xs text-neutral-400">
                    {hora(j.created_at)}
                  </td>
                  <td className="px-4 py-2.5 text-neutral-200">{j.tipo}</td>
                  <td
                    className={
                      "px-4 py-2.5 text-xs font-medium " +
                      (ESTADO_JOB[j.estado] ?? "text-neutral-400")
                    }
                  >
                    {j.estado}
                    {j.error_msg && (
                      <span className="text-neutral-500"> · {j.error_msg.slice(0, 60)}</span>
                    )}
                  </td>
                </tr>
              ))}
              {(!jobs || jobs.length === 0) && (
                <tr>
                  <td className="px-4 py-3 text-sm text-neutral-500">
                    Sin jobs todavía.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
