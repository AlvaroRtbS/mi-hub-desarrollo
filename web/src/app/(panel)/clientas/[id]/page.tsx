import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Boton } from "@/components/ui/boton";
import { EtiquetaEstado } from "@/components/ui/etiqueta-estado";
import { formatearFecha, hoyISO, inicialesNombre } from "@/lib/utilidades";
import type { Clienta, EstructuraPrograma } from "@/lib/supabase/tipos";
import {
  calcularAdherencia,
  diasProgramadosDeAsignacion,
} from "@/lib/adherencia";
import { AccionesEstado } from "./acciones-estado";
import { BotonAsignar } from "./boton-asignar";
import { BotonGenerarIA } from "./boton-generar-ia";
import { BotonCompartirPrograma } from "./boton-compartir";
import { BotonInvitar } from "./boton-invitar";
import { NotasInternas } from "./notas-internas";
import { PerfilDietetico } from "./perfil-dietetico";
import type { DietaRestricciones } from "@/lib/dieta";
import { BotonResumenIA } from "./boton-resumen-ia";
import { PanelLogros } from "./panel-logros";
import { HeatmapAdherencia } from "./heatmap-adherencia";
import { HeatmapAnual } from "./heatmap-anual";
import { InsightsMes } from "./insights-mes";
import { PanelObjetivos } from "./panel-objetivos";
import { GruposClienta } from "./grupos-clienta";
import { type TipoLogro, xpTotal as calcularXpTotal } from "@/lib/gamificacion";
import { GraficasMetricas } from "./graficas";
import { PasosRecientes } from "./pasos-recientes";
import { TabsNav, type TabClienta } from "./tabs-nav";
import { FichasEstructuradas } from "./fichas-estructuradas";
import { TodosClienta } from "./todos-clienta";
import { PestanaActividad } from "./pestana-actividad";
import { ComentariosSesiones } from "./comentarios-sesiones";
import type { TipoFicha } from "./fichas-tipos";
import { Tooltip } from "@/components/ui/tooltip";
import { PanelContrato, type EstadoContrato } from "./panel-contrato";
import { PanelInscripcionPagos } from "./panel-inscripcion-pagos";

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

const TABS_VALIDAS: TabClienta[] = [
  "resumen",
  "adherencia",
  "metricas",
  "proyecto",
  "actividad",
];

export default async function ClientaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab: tabParam } = await searchParams;
  const tab: TabClienta = (TABS_VALIDAS as string[]).includes(tabParam ?? "")
    ? (tabParam as TabClienta)
    : "resumen";

  const supabase = await createSupabaseServerClient();

  const { data: clienta } = await supabase
    .from("clientas")
    .select("*")
    .eq("id", id)
    .maybeSingle<Clienta>();

  if (!clienta) notFound();

  // Contrato de servicios (consentimiento RGPD)
  const { data: contratoRow } = await supabase
    .from("consentimientos")
    .select("estado")
    .eq("clienta_id", id)
    .eq("tipo", "contrato_servicios")
    .maybeSingle<{ estado: EstadoContrato }>();
  const contratoEstado: EstadoContrato = contratoRow?.estado ?? null;

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

  // Todas las sesiones (para racha / adherencia / última sesión)
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
  const ultimaSesionFecha =
    sesionesAll
      .filter((s) => s.completada)
      .map((s) => s.fecha)
      .sort()
      .pop() ?? null;

  // Fotos
  const { count: fotosCount } = await supabase
    .from("fotos_progreso")
    .select("id", { count: "exact", head: true })
    .eq("clienta_id", id);

  // Grupos
  const [{ data: gruposAsignados }, { data: todosGrupos }] = await Promise.all([
    supabase
      .from("clienta_grupos")
      .select("grupo_id, grupos(id, nombre, color)")
      .eq("clienta_id", id),
    supabase.from("grupos").select("id, nombre, color").order("nombre"),
  ]);
  type GrupoFila = { id: string; nombre: string; color: string | null };
  const gruposClienta = ((gruposAsignados ?? []) as unknown as Array<{
    grupos: GrupoFila;
  }>)
    .map((r) => r.grupos)
    .filter(Boolean);
  const grupos = (todosGrupos ?? []) as GrupoFila[];

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
  // hoyISO() es Europe/Madrid; en Vercel (UTC) toISOString() daría el día
  // anterior entre las 00:00 y la 01:00/02:00 de Madrid.
  const hoyIso = hoyISO();
  let adherencia: ReturnType<typeof calcularAdherencia> | null = null;
  let tokenShare: string | null = null;
  if (asignacionActiva) {
    // El estructura_snapshot puede ser muy grande (1+ MB en programas
    // migrados de TS con tareas/formularios). Envolvemos en try/catch
    // para que un fallo aquí no rompa el render entero de la ficha.
    try {
      const { data: asignFull, error: errAsign } = await supabase
        .from("asignaciones")
        .select("estructura_snapshot")
        .eq("id", asignacionActiva.id)
        .single();
      if (!errAsign && asignFull) {
        const programados = diasProgramadosDeAsignacion(
          asignacionActiva.fecha_inicio,
          asignFull.estructura_snapshot as EstructuraPrograma,
          hoyIso
        );
        adherencia = calcularAdherencia(programados, sesionesAll);
      }
    } catch (e) {
      console.error("[clienta/" + id + "] adherencia falló:", e);
      // continuamos sin adherencia, la página sigue funcionando
    }
    try {
      const { data: tk } = await supabase
        .from("asignacion_share_tokens")
        .select("token")
        .eq("asignacion_id", asignacionActiva.id)
        .maybeSingle();
      tokenShare = tk?.token ?? null;
    } catch (e) {
      console.error("[clienta/" + id + "] share token falló:", e);
    }
  }

  // Invitación activa
  const yaEnlazada = !!(clienta as unknown as { user_id?: string | null }).user_id;
  const { data: invitacionData } = await supabase
    .from("invitaciones_clienta")
    .select("token")
    .eq("clienta_id", clienta.id)
    .is("usada_en", null)
    .gt("expira_en", new Date().toISOString())
    .maybeSingle();
  const tokenInvitacion = invitacionData?.token ?? null;

  // WhatsApp-lite: enlace wa.me a partir de whatsapp_phone (o el teléfono).
  const waHref = enlaceWhatsapp(clienta.whatsapp_phone ?? clienta.telefono);

  return (
    <div className="p-8 mx-auto max-w-5xl">
      <Link href="/clientas" className="text-sm text-neutral-400 hover:text-neutral-200">
        ← Volver
      </Link>

      {/* Cabecera con identidad */}
      <div className="mt-4 flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-neutral-800 flex items-center justify-center text-xl font-semibold text-neutral-300 overflow-hidden">
            {clienta.foto_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={clienta.foto_url} alt="" className="w-full h-full object-cover" />
            ) : (
              inicialesNombre(clienta.nombre, clienta.apellidos)
            )}
          </div>
          <div>
            <h1 className="text-2xl font-semibold">
              {clienta.nombre} {clienta.apellidos ?? ""}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <EtiquetaEstado estado={clienta.estado} />
              <BadgeContratoMini estado={contratoEstado} />
              <span className="text-sm text-neutral-500">{clienta.email}</span>
            </div>
            <div className="mt-2">
              <GruposClienta
                clientaId={clienta.id}
                asignados={gruposClienta}
                todos={grupos}
              />
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {waHref && (
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 font-medium rounded-lg transition text-sm px-4 py-2 bg-[#25D366] hover:bg-[#1da851] text-white"
              title="Abrir chat de WhatsApp con esta clienta"
            >
              <span aria-hidden>💬</span> WhatsApp
            </a>
          )}
          <Boton variante="secundario" href={`/clientas/${clienta.id}/editar`}>
            Editar
          </Boton>
          <AccionesEstado clientaId={clienta.id} estado={clienta.estado} />
        </div>
      </div>

      {/* KPIs clave siempre visibles */}
      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi
          label="Programa activo"
          valor={asignacionActiva?.programas?.nombre ?? "—"}
          detalle={
            asignacionActiva?.programas
              ? `${asignacionActiva.programas.num_semanas} sem`
              : "Sin asignar"
          }
          tooltip={
            asignacionActiva
              ? "Programa en curso. Click para personalizarlo para esta clienta sin afectar el original."
              : "Aún sin programa asignado"
          }
          href={
            asignacionActiva
              ? `/clientas/${clienta.id}/programa`
              : undefined
          }
          cta={asignacionActiva ? "Personalizar plan" : undefined}
        />
        <Kpi
          label="Racha"
          valor={adherencia ? `${adherencia.rachaActual}` : "—"}
          detalle={
            adherencia
              ? adherencia.rachaActual >= 7
                ? "🔥 en fuego"
                : adherencia.rachaActual >= 3
                ? "💪 fuerte"
                : `Mejor: ${adherencia.rachaMaxima}`
              : "Sin programa"
          }
          tooltip="Días seguidos completando sesiones"
        />
        <Kpi
          label="Adherencia"
          valor={adherencia ? `${adherencia.porcentajeAdherencia}%` : "—"}
          detalle={
            adherencia
              ? `${adherencia.sesionesCompletadas}/${adherencia.sesionesProgramadas} sesiones`
              : "—"
          }
          tooltip="% de sesiones completadas sobre las programadas hasta hoy"
        />
        <Kpi
          label="Último entreno"
          valor={ultimaSesionFecha ? formatearFecha(ultimaSesionFecha) : "—"}
          detalle={
            ultimaSesionFecha
              ? diasDesde(ultimaSesionFecha) === 0
                ? "Hoy"
                : `Hace ${diasDesde(ultimaSesionFecha)} días`
              : "Sin sesiones"
          }
          tooltip="Fecha de la última sesión que la clienta marcó como completada"
        />
      </div>

      {/* Navegación de pestañas */}
      <div className="mt-8">
        <TabsNav clientaId={clienta.id} tabActiva={tab} />
      </div>

      {/* Contenido por pestaña */}
      <div className="mt-6">
        {tab === "resumen" && (
          <>
            <div className="mb-5">
              <InsightsMes clientaId={clienta.id} />
            </div>
            <SeccionResumen
              clienta={clienta}
              asignacionActiva={asignacionActiva}
              historico={historico}
              sesionesCount={sesionesCount}
              fotosCount={fotosCount ?? 0}
              tokenShare={tokenShare}
              tokenInvitacion={tokenInvitacion}
              yaEnlazada={yaEnlazada}
              contratoEstado={contratoEstado}
            />
          </>
        )}

        {tab === "adherencia" && (
          <SeccionAdherencia
            adherencia={adherencia}
            clientaId={clienta.id}
            hayAsignacion={!!asignacionActiva}
          />
        )}

        {tab === "metricas" && (
          <SeccionMetricas clientaId={clienta.id} metricas={metricas} />
        )}

        {tab === "proyecto" && (
          <SeccionProyecto
            clientaId={clienta.id}
            sesionesAll={sesionesAll}
            metricas={metricas}
            logrosDesbloqueados={logrosDesbloqueados}
            xpClienta={xpClienta}
            gamificacionActiva={gamificacionActiva}
          />
        )}

        {tab === "actividad" && (
          <div className="space-y-6">
            <ComentariosSesiones clientaId={clienta.id} />
            <PestanaActividad clientaId={clienta.id} />
          </div>
        )}
      </div>
    </div>
  );
}

// WhatsApp-lite: normaliza el número a formato wa.me (solo dígitos, con prefijo
// internacional). Si llega un móvil español de 9 dígitos sin prefijo, antepone 34.
function enlaceWhatsapp(numero: string | null | undefined): string | null {
  if (!numero) return null;
  let d = numero.replace(/\D/g, "");
  if (!d) return null;
  if (d.length === 9) d = "34" + d; // móvil ES sin prefijo
  return `https://wa.me/${d}`;
}

function BadgeContratoMini({ estado }: { estado: EstadoContrato }) {
  const mapa: Record<string, { txt: string; clase: string }> = {
    firmado: { txt: "📄 Contrato firmado", clase: "bg-green-500/15 text-green-400 border-green-500/30" },
    pendiente: { txt: "📄 Contrato pendiente", clase: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
    rechazado: { txt: "📄 Contrato rechazado", clase: "bg-red-500/15 text-red-400 border-red-500/30" },
  };
  const m = estado ? mapa[estado] : { txt: "📄 Sin contrato", clase: "bg-neutral-700/30 text-neutral-400 border-neutral-700" };
  return (
    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${m.clase}`}>
      {m.txt}
    </span>
  );
}

function diasDesde(iso: string): number {
  // Comparamos día-calendario contra día-calendario en UTC (patrón +T00:00:00Z)
  // para no depender de la zona horaria del servidor.
  const hoy = new Date(hoyISO() + "T00:00:00Z");
  const f = new Date(iso.slice(0, 10) + "T00:00:00Z");
  return Math.max(0, Math.floor((hoy.getTime() - f.getTime()) / 86400000));
}

function Kpi({
  label,
  valor,
  detalle,
  tooltip,
  href,
  cta,
}: {
  label: string;
  valor: string;
  detalle?: string;
  tooltip?: string;
  href?: string;
  cta?: string;
}) {
  const labelNode = (
    <div className="text-[10px] uppercase tracking-wide text-neutral-500 mb-1 inline-flex items-center gap-1">
      {label}
      {tooltip && <span className="text-neutral-700">ⓘ</span>}
    </div>
  );

  const contenido = (
    <>
      {tooltip ? (
        <Tooltip contenido={tooltip} posicion="bottom">
          {labelNode}
        </Tooltip>
      ) : (
        labelNode
      )}
      <div className="text-lg font-semibold truncate" title={valor}>
        {valor}
      </div>
      {detalle && (
        <div className="text-xs text-neutral-500 mt-0.5 truncate">{detalle}</div>
      )}
      {cta && href && (
        <div
          className="text-[11px] mt-2 inline-flex items-center gap-1 font-medium"
          style={{ color: "var(--brand)" }}
        >
          {cta} →
        </div>
      )}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="block border border-neutral-800 rounded-2xl p-4 hover:border-neutral-700 hover:bg-neutral-900/40 transition group"
      >
        {contenido}
      </Link>
    );
  }
  return <div className="border border-neutral-800 rounded-2xl p-4">{contenido}</div>;
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

// ============================================================================
// Pestañas
// ============================================================================

function SeccionResumen({
  clienta,
  asignacionActiva,
  historico,
  sesionesCount,
  fotosCount,
  tokenShare,
  tokenInvitacion,
  yaEnlazada,
  contratoEstado,
}: {
  clienta: Clienta;
  asignacionActiva: AsignacionResumen | undefined;
  historico: AsignacionResumen[];
  sesionesCount: number;
  fotosCount: number;
  tokenShare: string | null;
  tokenInvitacion: string | null;
  yaEnlazada: boolean;
  contratoEstado: EstadoContrato;
}) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <Tarjeta titulo="Teléfono" valor={clienta.telefono ?? "—"} />
        <Tarjeta titulo="Fecha nacimiento" valor={formatearFecha(clienta.fecha_nacimiento)} />
        <Tarjeta titulo="Alta" valor={formatearFecha(clienta.creada_en)} />
      </div>

      {/* Contrato de servicios (RGPD) */}
      <PanelContrato clientaId={clienta.id} estado={contratoEstado} />

      {/* Inscripción y pagos (CRM Fase 3) */}
      <PanelInscripcionPagos clientaId={clienta.id} />

      {clienta.notas_publicas && (
        <div className="border border-neutral-800 rounded-2xl p-5">
          <div className="text-xs uppercase tracking-wide text-neutral-500 mb-2">
            Notas visibles para la clienta
          </div>
          <div className="text-sm whitespace-pre-wrap">{clienta.notas_publicas}</div>
        </div>
      )}

      {/* Programa asignado */}
      <div className="border border-neutral-800 rounded-2xl p-5">
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

      {/* Actividad */}
      <div className="border border-neutral-800 rounded-2xl p-5">
        <h3 className="font-medium mb-3">Actividad</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <Mini label="Sesiones" valor={sesionesCount} />
          <Mini label="Fotos progreso" valor={fotosCount} />
        </div>
      </div>

      {/* Más de esta clienta (navegación) */}
      <div className="border border-neutral-800 rounded-2xl p-5">
        <h3 className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 mb-3">
          Más de esta clienta
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {asignacionActiva && (
            <Link
              href={`/clientas/${clienta.id}/programa`}
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-neutral-800 bg-neutral-900/40 hover:bg-neutral-900 hover:border-neutral-700 text-sm text-neutral-200 transition"
              title="Personaliza el plan asignado a esta clienta (sin tocar el base)"
            >
              ✏️ <span className="truncate">Plan personalizado</span>
            </Link>
          )}
          <Link
            href={`/clientas/${clienta.id}/fotos`}
            className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-neutral-800 bg-neutral-900/40 hover:bg-neutral-900 hover:border-neutral-700 text-sm text-neutral-200 transition"
          >
            📸 <span className="truncate">Fotos / comparador</span>
          </Link>
          <Link
            href={`/clientas/${clienta.id}/ejercicios`}
            className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-neutral-800 bg-neutral-900/40 hover:bg-neutral-900 hover:border-neutral-700 text-sm text-neutral-200 transition"
          >
            📊 <span className="truncate">Histórico ejercicios</span>
          </Link>
          <Link
            href={`/clientas/${clienta.id}/formulario`}
            className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-neutral-800 bg-neutral-900/40 hover:bg-neutral-900 hover:border-neutral-700 text-sm text-neutral-200 transition"
          >
            📋 <span className="truncate">Valoración inicial</span>
          </Link>
          <Link
            href={`/clientas/${clienta.id}/checkins`}
            className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-neutral-800 bg-neutral-900/40 hover:bg-neutral-900 hover:border-neutral-700 text-sm text-neutral-200 transition"
          >
            ✅ <span className="truncate">Check-ins semanales</span>
          </Link>
          <Link
            href={`/clientas/${clienta.id}/vista-clienta`}
            className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-neutral-800 bg-neutral-900/40 hover:bg-neutral-900 hover:border-neutral-700 text-sm text-neutral-200 transition"
          >
            👁️ <span className="truncate">Ver como la clienta</span>
          </Link>
          <a
            href={`/imprimir/clienta/${clienta.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-neutral-800 bg-neutral-900/40 hover:bg-neutral-900 hover:border-neutral-700 text-sm text-neutral-200 transition"
            title="Abre la vista de impresión / PDF de un reporte de esta clienta"
          >
            🖨️ <span className="truncate">Imprimir / PDF</span>
          </a>
        </div>
      </div>

      {/* Acciones */}
      <div className="border border-neutral-800 rounded-2xl p-5">
        <h3 className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 mb-3">
          Acciones
        </h3>
        <div className="flex flex-wrap gap-2 text-xs">
          <BotonGenerarIA clientaId={clienta.id} />
          {asignacionActiva && (
            <BotonCompartirPrograma
              asignacionId={asignacionActiva.id}
              clientaId={clienta.id}
              clientaNombre={clienta.nombre}
              tokenExistente={tokenShare}
            />
          )}
          <BotonInvitar
            clientaId={clienta.id}
            clientaNombre={clienta.nombre}
            yaEnlazada={yaEnlazada}
            tokenExistente={tokenInvitacion}
          />
        </div>
      </div>
    </div>
  );
}

function SeccionAdherencia({
  adherencia,
  clientaId,
  hayAsignacion,
}: {
  adherencia: ReturnType<typeof calcularAdherencia> | null;
  clientaId: string;
  hayAsignacion: boolean;
}) {
  if (!hayAsignacion || !adherencia) {
    return (
      <div className="border border-dashed border-neutral-800 rounded-2xl p-12 text-center">
        <div className="text-neutral-400">Sin datos de adherencia.</div>
        <div className="text-sm text-neutral-500 mt-2">
          Asigna un programa para empezar a registrar adherencia.
        </div>
      </div>
    );
  }

  return (
    <div className="border border-neutral-800 rounded-2xl p-5">
      <h3 className="font-medium mb-4">Adherencia</h3>
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
        <HeatmapAdherencia clientaId={clientaId} />
      </div>
      <div className="mt-5">
        <HeatmapAnual clientaId={clientaId} />
      </div>
    </div>
  );
}

function SeccionMetricas({
  clientaId,
  metricas,
}: {
  clientaId: string;
  metricas: MetricaReciente[];
}) {
  return (
    <div className="space-y-6">
      <div className="border border-neutral-800 rounded-2xl p-5">
        <h3 className="font-medium mb-3">Últimas métricas</h3>
        {metricas.length === 0 ? (
          <div className="text-sm text-neutral-500">Sin métricas registradas aún.</div>
        ) : (
          <ul className="space-y-1.5 text-sm">
            {metricas.slice(0, 10).map((m) => (
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

      <PasosRecientes clientaId={clientaId} />

      <div className="border border-neutral-800 rounded-2xl p-5">
        <h3 className="font-medium mb-4">Evolución</h3>
        <GraficasMetricas clientaId={clientaId} />
      </div>
    </div>
  );
}

async function SeccionProyecto({
  clientaId,
  sesionesAll,
  metricas,
  logrosDesbloqueados,
  xpClienta,
  gamificacionActiva,
}: {
  clientaId: string;
  sesionesAll: Array<{ id: string; fecha: string; completada: boolean }>;
  metricas: MetricaReciente[];
  logrosDesbloqueados: Array<{ tipo: TipoLogro; conseguido_en: string }>;
  xpClienta: number;
  gamificacionActiva: boolean;
}) {
  const supabase = await createSupabaseServerClient();

  // Notas internas
  const { data: notasData } = await supabase
    .from("notas")
    .select("id, contenido, creada_en")
    .eq("clienta_id", clientaId)
    .order("creada_en", { ascending: false })
    .limit(50);
  const notas = (notasData ?? []) as Array<{
    id: string;
    contenido: string;
    creada_en: string;
  }>;

  // Perfil dietético (restricciones para el generador de menús)
  const { data: clientaDieta } = await supabase
    .from("clientas")
    .select("dieta_restricciones")
    .eq("id", clientaId)
    .maybeSingle<{ dieta_restricciones: DietaRestricciones }>();
  const dietaRestricciones = clientaDieta?.dieta_restricciones ?? {};

  // Objetivos
  const { data: objetivosData } = await supabase
    .from("objetivos")
    .select(
      "id, titulo, descripcion, tipo, valor_inicial, valor_objetivo, unidad, fecha_limite, estado, conseguido_en, creado_en"
    )
    .eq("clienta_id", clientaId)
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

  // Fichas estructuradas
  const { data: fichasData } = await supabase
    .from("fichas_clienta")
    .select("tipo, contenido, actualizada_en")
    .eq("clienta_id", clientaId);
  const fichas = (fichasData ?? []) as Array<{
    tipo: TipoFicha;
    contenido: string;
    actualizada_en: string | null;
  }>;

  // To-dos
  const { data: todosData } = await supabase
    .from("todos_clienta")
    .select("id, titulo, completado, fecha_limite, completado_en, creado_en")
    .eq("clienta_id", clientaId)
    .order("creado_en", { ascending: false });
  const todos = (todosData ?? []) as Array<{
    id: string;
    titulo: string;
    completado: boolean;
    fecha_limite: string | null;
    completado_en: string | null;
    creado_en: string;
  }>;

  // Valor actual por tipo de métrica (para barra de progreso en objetivos)
  const valorActualPorTipo: Record<string, number | null> = {};
  metricas.forEach((m) => {
    if (!(m.tipo in valorActualPorTipo)) {
      valorActualPorTipo[m.tipo] = Number(m.valor);
    }
  });
  valorActualPorTipo["sesiones_completadas"] = sesionesAll.filter(
    (s) => s.completada
  ).length;

  return (
    <div className="space-y-6">
      {/* Objetivos */}
      <PanelObjetivos
        clientaId={clientaId}
        objetivos={objetivos}
        valorActualPorTipo={valorActualPorTipo}
      />

      {/* Logros */}
      <PanelLogros
        clientaId={clientaId}
        desbloqueados={logrosDesbloqueados}
        xpTotal={xpClienta}
        gamificacionActiva={gamificacionActiva}
      />

      {/* Fichas estructuradas */}
      <div className="border border-neutral-800 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium">📋 Fichas de la clienta</h3>
        </div>
        <FichasEstructuradas clientaId={clientaId} fichas={fichas} />
      </div>

      {/* To-dos */}
      <div className="border border-neutral-800 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium">✅ Tareas pendientes</h3>
          <span className="text-[10px] text-neutral-500 uppercase tracking-wide bg-neutral-900 px-2 py-1 rounded">
            🔒 Solo tú
          </span>
        </div>
        <TodosClienta clientaId={clientaId} todos={todos} />
      </div>

      {/* Notas internas (CRM) */}
      <div className="border border-neutral-800 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium">📝 Notas internas</h3>
          <span className="text-[10px] text-neutral-500 uppercase tracking-wide bg-neutral-900 px-2 py-1 rounded">
            🔒 Solo tú
          </span>
        </div>
        <NotasInternas clientaId={clientaId} notasIniciales={notas} />
      </div>

      {/* Perfil dietético (alimenta al generador de menús) */}
      <div className="border border-neutral-800 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium">🥗 Perfil dietético</h3>
          <span className="text-[10px] text-neutral-500 uppercase tracking-wide bg-neutral-900 px-2 py-1 rounded">
            Para los menús
          </span>
        </div>
        <PerfilDietetico clientaId={clientaId} inicial={dietaRestricciones} />
      </div>

      {/* Resumen IA */}
      <BotonResumenIA clientaId={clientaId} />
    </div>
  );
}
