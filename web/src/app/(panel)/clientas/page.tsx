import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Boton } from "@/components/ui/boton";
import { EtiquetaEstado } from "@/components/ui/etiqueta-estado";
import { BuscadorDebounced } from "@/components/ui/buscador-debounced";
import { EmptyState } from "@/components/ui/empty-state";
import { formatearFecha, inicialesNombre } from "@/lib/utilidades";
import type { Clienta, EstadoClienta } from "@/lib/supabase/tipos";

const FILTROS: Array<{ valor: EstadoClienta | "todas"; label: string }> = [
  { valor: "activa", label: "Activas" },
  { valor: "invitada", label: "Invitadas" },
  { valor: "archivada", label: "Archivadas" },
  { valor: "todas", label: "Todas" },
];

export default async function ClientasPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; q?: string }>;
}) {
  const params = await searchParams;
  const filtro = (FILTROS.find((f) => f.valor === params.estado)?.valor ?? "activa") as
    | EstadoClienta
    | "todas";
  const q = (params.q ?? "").trim();

  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("clientas")
    .select(
      "id, nombre, apellidos, email, estado, foto_url, creada_en, asignaciones(programas(nombre), activa)"
    )
    .order("nombre");

  if (filtro !== "todas") query = query.eq("estado", filtro);
  // Sanea q: comas, paréntesis, comodines y barras romperían/alterarían el
  // filtro PostgREST `.or(...)`. Se eliminan antes de construirlo.
  const qSafe = q.replace(/[%,()*\\]/g, "").trim();
  if (qSafe)
    query = query.or(
      `nombre.ilike.%${qSafe}%,apellidos.ilike.%${qSafe}%,email.ilike.%${qSafe}%`
    );

  const { data: clientasData, error } = await query;
  const clientas = (clientasData ?? []) as unknown as Array<
    Clienta & {
      asignaciones: Array<{ activa: boolean; programas: { nombre: string } | null }>;
    }
  >;

  // Cargar últimas 30 sesiones por cada clienta para indicador rápido
  // de actividad (racha si va bien, alerta si lleva días sin entrenar).
  const ids = clientas.map((c) => c.id);
  const hace30 = new Date();
  hace30.setDate(hace30.getDate() - 30);
  const { data: sesionesAll } = await supabase
    .from("sesiones")
    .select("clienta_id, fecha, completada")
    .in("clienta_id", ids.length > 0 ? ids : ["00000000-0000-0000-0000-000000000000"])
    .gte("fecha", hace30.toISOString().slice(0, 10))
    .order("fecha", { ascending: false });

  const sesionesPorClienta = new Map<
    string,
    Array<{ fecha: string; completada: boolean }>
  >();
  for (const s of (sesionesAll ?? []) as Array<{
    clienta_id: string;
    fecha: string;
    completada: boolean;
  }>) {
    const arr = sesionesPorClienta.get(s.clienta_id) ?? [];
    arr.push({ fecha: s.fecha, completada: s.completada });
    sesionesPorClienta.set(s.clienta_id, arr);
  }

  const hoyIso = new Date().toISOString().slice(0, 10);
  function indicadorActividad(clientaId: string): {
    racha: number;
    diasSinEntrenar: number | null;
  } {
    const ses = sesionesPorClienta.get(clientaId) ?? [];
    let racha = 0;
    for (const s of ses) {
      if (s.completada) racha++;
      else break;
    }
    const ultimaCompletada = ses.find((s) => s.completada);
    let diasSin: number | null = null;
    if (ultimaCompletada) {
      const d = new Date(ultimaCompletada.fecha + "T00:00:00Z");
      diasSin = Math.floor(
        (new Date(hoyIso + "T00:00:00Z").getTime() - d.getTime()) / 86400000
      );
    }
    return { racha, diasSinEntrenar: diasSin };
  }

  return (
    <div className="p-8 mx-auto max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Clientas</h1>
          <p className="text-sm text-neutral-400 mt-1">
            Gestiona tu lista de clientas, ve su estado y accede a sus perfiles.
          </p>
        </div>
        <div className="flex gap-2">
          <Boton variante="secundario" href="/clientas/comparativa">
            📊 Comparativa
          </Boton>
          <Boton variante="secundario" href="/clientas/grupos">
            Grupos
          </Boton>
          <Boton variante="secundario" href="/clientas/onboarding">
            Activación
          </Boton>
          <Boton href="/clientas/nueva">+ Añadir clienta</Boton>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="flex gap-1">
          {FILTROS.map((f) => {
            const activo = f.valor === filtro;
            const params = new URLSearchParams();
            if (f.valor !== "activa") params.set("estado", f.valor);
            if (q) params.set("q", q);
            const href = "/clientas" + (params.toString() ? `?${params}` : "");
            return (
              <Link
                key={f.valor}
                href={href}
                className={
                  "text-sm px-3 py-1.5 rounded-lg border " +
                  (activo
                    ? "bg-neutral-800 border-neutral-700 text-white"
                    : "border-transparent text-neutral-400 hover:text-white hover:bg-neutral-900")
                }
              >
                {f.label}
              </Link>
            );
          })}
        </div>

        <div className="w-full max-w-xs">
          <BuscadorDebounced
            placeholder="Buscar por nombre o email..."
            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-brand-500"
          />
        </div>
      </div>

      {error && (
        <div className="text-sm text-red-400 bg-red-950/30 border border-red-900/50 rounded-lg px-4 py-3 mb-4">
          {error.message}
        </div>
      )}

      {clientas.length === 0 ? (
        <EmptyState
          icono="👥"
          titulo={
            q
              ? "Ninguna clienta coincide con la búsqueda"
              : "Aún no tienes clientas con este estado"
          }
          descripcion={
            !q
              ? "Cuando migremos desde TrainerStudio o añadas la primera, aparecerá aquí."
              : undefined
          }
          accion={
            !q ? <Boton href="/clientas/nueva">+ Añadir tu primera clienta</Boton> : null
          }
        />
      ) : (
        <div className="border border-neutral-800 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-neutral-900 text-neutral-400">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Nombre</th>
                <th className="text-left px-4 py-3 font-medium">Programa activo</th>
                <th className="text-left px-4 py-3 font-medium">Estado</th>
                <th className="text-left px-4 py-3 font-medium">Alta</th>
              </tr>
            </thead>
            <tbody>
              {clientas.map((c) => {
                const activo = c.asignaciones?.find((a) => a.activa);
                return (
                  <tr
                    key={c.id}
                    className="border-t border-neutral-800 hover:bg-neutral-900/50"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/clientas/${c.id}`}
                        className="flex items-center gap-3 hover:text-brand-500"
                      >
                        <span className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center text-xs font-medium text-neutral-300 overflow-hidden flex-shrink-0">
                          {c.foto_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={c.foto_url}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            inicialesNombre(c.nombre, c.apellidos)
                          )}
                        </span>
                        <span className="min-w-0">
                          <span className="flex items-center gap-1.5 truncate">
                            <span className="truncate">
                              {c.nombre} {c.apellidos ?? ""}
                            </span>
                            {(() => {
                              const a = indicadorActividad(c.id);
                              if (a.racha >= 7)
                                return (
                                  <span
                                    title={`${a.racha} días seguidos entrenando`}
                                    className="text-xs"
                                  >
                                    🔥{a.racha}
                                  </span>
                                );
                              if (a.racha >= 3)
                                return (
                                  <span
                                    title={`${a.racha} días seguidos`}
                                    className="text-xs"
                                  >
                                    💪{a.racha}
                                  </span>
                                );
                              if (
                                a.diasSinEntrenar != null &&
                                a.diasSinEntrenar >= 7
                              )
                                return (
                                  <span
                                    title={`${a.diasSinEntrenar} días sin entrenar`}
                                    className="text-xs text-red-400"
                                  >
                                    ⚠ {a.diasSinEntrenar}d
                                  </span>
                                );
                              return null;
                            })()}
                          </span>
                          <span className="block text-xs text-neutral-500 truncate">
                            {c.email}
                          </span>
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-neutral-400">
                      {activo?.programas?.nombre ?? (
                        <span className="text-neutral-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <EtiquetaEstado estado={c.estado} />
                    </td>
                    <td className="px-4 py-3 text-neutral-400">
                      {formatearFecha(c.creada_en)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
