import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Boton } from "@/components/ui/boton";
import { EtiquetaEstado } from "@/components/ui/etiqueta-estado";
import { formatearFecha, inicialesNombre } from "@/lib/utilidades";
import type { Clienta, EstructuraPrograma } from "@/lib/supabase/tipos";
import {
  calcularAdherencia,
  diasProgramadosDeAsignacion,
} from "@/lib/adherencia";
import { AccionesEstado } from "./acciones-estado";
import { BotonAsignar } from "./boton-asignar";
import { BotonGenerarIA } from "./boton-generar-ia";
import { BotonCompartirPrograma } from "./boton-compartir";
import { NotasInternas } from "./notas-internas";
import { BotonResumenIA } from "./boton-resumen-ia";
import { PanelLogros } from "./panel-logros";
import { HeatmapAdherencia } from "./heatmap-adherencia";
import { PanelObjetivos } from "./panel-objetivos";
import { LOGROS, type TipoLogro, xpTotal as calcularXpTotal } from "@/lib/gamificacion";
import { GraficasMetricas } from "./graficas";

type AsignacionResumen = {
  id: string;
  programa_id: string;
  fecha_inicio: string;
  fecha_fin: string | null;
  activa: boolean;
  creada_en: string;
  programas: { nombre: string; num_semanas: number } | null;
};

type MetricaReciente = {
  id: string;
  tipo: string;
  valor: number;
  unidad: string;
  fecha: string;
};

export default async function ClientaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: clienta } = await supabase
    .from("clientas")
    .select("*")
    .eq("id", id)
    .maybeSingle<Clienta>();

  if (!clienta) notFound();

  // Asignaciones activas
  const { data: asignacionesData } = await supabase
    .from("asignaciones")
    .select(
      "id, programa_id, fecha_inicio, fecha_fin, activa, creada_en, programas(nombre, num_semanas)"
    )
    .eq("clienta_id", id)
    .order("creada_en", { ascending: false });

  const asignaciones = (asignacionesData ?? []) as unknown as AsignacionResumen[];
  const asignacionActiva = asignaciones.find((a) => a.activa);
  const historico = asignaciones.filter((a) => !a.activa);

  // Últimas métricas
  const { data: metricasData } = await supabase
    .from("metricas")
    .select("id, tipo, valor, unidad, fecha")
    .eq("clienta_id", id)
    .order("fecha", { ascending: false })
    .limit(10);
  const metricas = (metricasData ?? []) as MetricaReciente[];

  // Todas las sesiones (para racha / adherencia)
  const { data: sesionesData } = await supabase
    .from("sesiones")
    .select("id, fecha, completada")
    .eq("clienta_id", id);
  const sesionesAll = (sesionesData ?? []) as Array<{
    id: string;
    fecha: string;
    completada: boolean;
  }>;
  const sesionesCount = sesionesAll.length;

  // Fotos
  const { count: fotosCount } = await supabase
    .from("fotos_progreso")
    .select("id", { count: "exact", head: true })
    .eq("clienta_id", id);

  // Notas internas
  const { data: notasData } = await supabase
    .from("notas")
    .select("id, contenido, creada_en")
    .eq("clienta_id", id)
    .order("creada_en", { ascending: false })
    .limit(20);
  const notas = (notasData ?? []) as Array<{
    id: string;
    contenido: string;
    creada_en: string;
  }>;

  // Objetivos
  const { data: objetivosData } = await supabase
    .from("objetivos")
    .select(
      "id, titulo, descripcion, tipo, valor_inicial, valor_objetivo, unidad, fecha_limite, estado, conseguido_en, creado_en"
    )
    .eq("clienta_id", id)
    .order("creado_en", { ascending: false });
  const objetivos = (objetivosData ?? []) as Array<{
    id: string;
    titulo: string;
    descripcion: string | null;
    tipo: string;
    valor_inicial: number | null;
    valor_objetivo: number | null;
    unidad: string | null;
    fecha_limite: string | null;
    estado: "activo" | "conseguido" | "archivado";
    conseguido_en: string | null;
    creado_en: string;
  }>;

  // Valor actual por tipo de métrica (último valor registrado)
  const valorActualPorTipo: Record<string, number | null> = {};
  metricas.forEach((m) => {
    if (!(m.tipo in valorActualPorTipo)) {
      valorActualPorTipo[m.tipo] = Number(m.valor);
    }
  });
  valorActualPorTipo["sesiones_completadas"] = sesionesAll.filter(
    (s) => s.completada
  ).length;

  // Logros desbloqueados
  const { data: logrosData } = await supabase
    .from("logros")
    .select("tipo, conseguido_en")
    .eq("clienta_id", id)
    .order("conseguido_en", { ascending: false });
  const logrosDesbloqueados = (logrosData ?? []) as Array<{
    tipo: TipoLogro;
    conseguido_en: string;
  }>;
  const xpClienta = calcularXpTotal(logrosDesbloqueados.map((l) => l.tipo));
  const gamificacionActiva =
    (clienta as unknown as { gamificacion_activa?: boolean }).gamificacion_activa ?? true;

  // Adherencia: si tiene asignación activa, calcular racha y %.
  const hoyIso = new Date().toISOString().slice(0, 10);
  let adherencia: ReturnType<typeof calcularAdherencia> | null = null;
  let tokenShare: string | null = null;
  if (asignacionActiva) {
    const { data: asignFull } = await supabase
      .from("asignaciones")
      .select("estructura_snapshot")
      .eq("id", asignacionActiva.id)
      .single();
    if (asignFull) {
      const programados = diasProgramadosDeAsignacion(
        asignacionActiva.fecha_inicio,
        asignFull.estructura_snapshot as EstructuraPrograma,
        hoyIso
      );
      adherencia = calcularAdherencia(programados, sesionesAll);
    }
    const { data: tk } = await supabase
      .from("asignacion_share_tokens")
      .select("token")
      .eq("asignacion_id", asignacionActiva.id)
      .maybeSingle();
    tokenShare = tk?.token ?? null;
  }

  return (
    <div className="p-8 max-w-5xl">
      <Link href="/clientas" className="text-sm text-neutral-400 hover:text-neutral-200">
        ← Volver
      </Link>

      <div className="mt-4 flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-neutral-800 flex items-center justify-center text-xl font-semibold text-neutral-300">
            {inicialesNombre(clienta.nombre, clienta.apellidos)}
          </div>
          <div>
            <h1 className="text-2xl font-semibold">
              {clienta.nombre} {clienta.apellidos ?? ""}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <EtiquetaEstado estado={clienta.estado} />
              <span className="text-sm text-neutral-500">{clienta.email}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Boton variante="secundario" href={`/clientas/${clienta.id}/editar`}>
            Editar
          </Boton>
          <AccionesEstado clientaId={clienta.id} estado={clienta.estado} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mt-8">
        <Tarjeta titulo="Teléfono" valor={clienta.telefono ?? "—"} />
        <Tarjeta titulo="Fecha nacimiento" valor={formatearFecha(clienta.fecha_nacimiento)} />
        <Tarjeta titulo="Alta" valor={formatearFecha(clienta.creada_en)} />
      </div>

      {clienta.notas_publicas && (
        <div className="mt-6 border border-neutral-800 rounded-2xl p-5">
          <div className="text-xs uppercase tracking-wide text-neutral-500 mb-2">
            Notas visibles para la clienta
          </div>
          <div className="text-sm whitespace-pre-wrap">{clienta.notas_publicas}</div>
        </div>
      )}

      {/* Programa asignado */}
      <div className="mt-8 border border-neutral-800 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Programa asignado</h2>
          <BotonAsignar clientaId={clienta.id} tieneActiva={!!asignacionActiva} />
        </div>
        {asignacionActiva ? (
          <div>
            <Link
              href={`/programas/${asignacionActiva.programa_id}`}
              className="text-base font-medium hover:text-brand-500"
            >
              {asignacionActiva.programas?.nombre ?? "Programa"}
            </Link>
            <div className="text-sm text-neutral-400 mt-1">
              {formatearFecha(asignacionActiva.fecha_inicio)}
              {asignacionActiva.fecha_fin && (
                <> → {formatearFecha(asignacionActiva.fecha_fin)}</>
              )}
              {asignacionActiva.programas && (
                <> · {asignacionActiva.programas.num_semanas} semanas</>
              )}
            </div>
          </div>
        ) : (
          <div className="text-sm text-neutral-500">
            Sin programa activo. Asígnale uno desde la pantalla de Programas.
          </div>
        )}
        {historico.length > 0 && (
          <div className="mt-4 pt-4 border-t border-neutral-800">
            <div className="text-xs uppercase tracking-wide text-neutral-500 mb-2">
              Historial ({historico.length})
            </div>
            <ul className="space-y-1 text-sm">
              {historico.slice(0, 5).map((a) => (
                <li key={a.id} className="text-neutral-400">
                  <Link
                    href={`/programas/${a.programa_id}`}
                    className="hover:text-brand-500"
                  >
                    {a.programas?.nombre ?? "Programa"}
                  </Link>{" "}
                  <span className="text-neutral-600">
                    · {formatearFecha(a.fecha_inicio)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Adherencia */}
      {adherencia && (
        <div className="mt-6 border border-neutral-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium">Adherencia</h3>
          </div>
          <div className="grid grid-cols-4 gap-3">
            <Mini
              label="Racha actual"
              valor={adherencia.rachaActual}
              sufijo={
                adherencia.rachaActual >= 7
                  ? "🔥"
                  : adherencia.rachaActual >= 3
                  ? "💪"
                  : ""
              }
            />
            <Mini label="Mejor racha" valor={adherencia.rachaMaxima} />
            <Mini
              label="% adherencia"
              valor={adherencia.porcentajeAdherencia}
              sufijo="%"
            />
            <Mini
              label="Sesiones"
              valor={adherencia.sesionesCompletadas}
              sufijo={`/${adherencia.sesionesProgramadas}`}
            />
          </div>
          <div className="mt-5 pt-5 border-t border-neutral-900">
            <HeatmapAdherencia clientaId={clienta.id} />
          </div>
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Últimas métricas */}
        <div className="border border-neutral-800 rounded-2xl p-5">
          <h3 className="font-medium mb-3">Últimas métricas</h3>
          {metricas.length === 0 ? (
            <div className="text-sm text-neutral-500">
              Sin métricas registradas aún.
            </div>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {metricas.slice(0, 6).map((m) => (
                <li
                  key={m.id}
                  className="flex items-center justify-between text-neutral-300"
                >
                  <span className="capitalize">{m.tipo.replace(/_/g, " ")}</span>
                  <span className="text-neutral-400">
                    {m.valor} {m.unidad}{" "}
                    <span className="text-neutral-600 text-xs">
                      · {formatearFecha(m.fecha)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Actividad y atajos */}
        <div className="border border-neutral-800 rounded-2xl p-5">
          <h3 className="font-medium mb-3">Actividad</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Mini label="Sesiones" valor={sesionesCount} />
            <Mini label="Fotos progreso" valor={fotosCount ?? 0} />
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <Link
              href={`/clientas/${clienta.id}/vista-clienta`}
              className="text-brand-500 hover:text-brand-400"
            >
              Ver como la clienta →
            </Link>
            <Link
              href={`/clientas/${clienta.id}/fotos`}
              className="text-brand-500 hover:text-brand-400"
            >
              Comparador de fotos →
            </Link>
            <BotonGenerarIA clientaId={clienta.id} />
            {asignacionActiva && (
              <BotonCompartirPrograma
                asignacionId={asignacionActiva.id}
                clientaId={clienta.id}
                clientaNombre={clienta.nombre}
                tokenExistente={tokenShare}
              />
            )}
          </div>
        </div>
      </div>

      {/* Objetivos */}
      <div className="mt-6">
        <PanelObjetivos
          clientaId={clienta.id}
          objetivos={objetivos}
          valorActualPorTipo={valorActualPorTipo}
        />
      </div>

      {/* Logros y nivel */}
      <div className="mt-6">
        <PanelLogros
          clientaId={clienta.id}
          desbloqueados={logrosDesbloqueados}
          xpTotal={xpClienta}
          gamificacionActiva={gamificacionActiva}
        />
      </div>

      {/* Resumen IA */}
      <div className="mt-6">
        <BotonResumenIA clientaId={clienta.id} />
      </div>

      {/* Gráficas de evolución */}
      <div className="mt-6 border border-neutral-800 rounded-2xl p-5">
        <h3 className="font-medium mb-4">Evolución</h3>
        <GraficasMetricas clientaId={clienta.id} />
      </div>

      {/* Notas internas (solo coach) */}
      <div className="mt-6 border border-neutral-800 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium">Notas internas</h3>
          <span className="text-[10px] text-neutral-500 uppercase tracking-wide bg-neutral-900 px-2 py-1 rounded">
            🔒 Solo tú
          </span>
        </div>
        <NotasInternas clientaId={clienta.id} notasIniciales={notas} />
      </div>
    </div>
  );
}

function Tarjeta({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="border border-neutral-800 rounded-2xl p-4">
      <div className="text-xs uppercase tracking-wide text-neutral-500 mb-1">
        {titulo}
      </div>
      <div className="text-sm">{valor}</div>
    </div>
  );
}

function Mini({
  label,
  valor,
  sufijo,
}: {
  label: string;
  valor: number | string;
  sufijo?: string;
}) {
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide text-neutral-500">
        {label}
      </div>
      <div className="text-lg font-semibold">
        {valor}
        {sufijo && <span className="text-sm text-neutral-400 ml-1">{sufijo}</span>}
      </div>
    </div>
  );
}
