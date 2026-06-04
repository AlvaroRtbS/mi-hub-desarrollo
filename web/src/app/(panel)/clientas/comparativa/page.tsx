import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { EstructuraPrograma } from "@/lib/supabase/tipos";
import {
  diasProgramadosDeAsignacion,
  calcularAdherencia,
  type ResumenAdherencia,
} from "@/lib/adherencia";
import { calcularNivel, xpTotal as calcularXpTotal, type TipoLogro } from "@/lib/gamificacion";
import { Boton } from "@/components/ui/boton";
import { TablaComparativa, type FilaComparativa } from "./tabla";

type GrupoFila = { id: string; nombre: string; color: string | null };

function fechaISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function diasEntre(a: string, b: string): number {
  const fa = new Date(a + "T00:00:00Z");
  const fb = new Date(b + "T00:00:00Z");
  return Math.floor((fb.getTime() - fa.getTime()) / 86400000);
}

export default async function ComparativaPage({
  searchParams,
}: {
  searchParams: Promise<{ grupo?: string }>;
}) {
  const params = await searchParams;
  const grupoFiltroId = params.grupo;

  const supabase = await createSupabaseServerClient();
  const hoy = fechaISO(new Date());

  // Grupos para filtros
  const { data: gruposData } = await supabase
    .from("grupos")
    .select("id, nombre, color")
    .order("nombre");
  const grupos = (gruposData ?? []) as GrupoFila[];

  // Clientas activas + invitadas + sus grupos
  let queryClientas = supabase
    .from("clientas")
    .select(
      "id, nombre, apellidos, email, estado, creada_en, clienta_grupos(grupo_id, grupos(id, nombre, color))"
    )
    .in("estado", ["activa", "invitada"])
    .order("nombre");

  if (grupoFiltroId) {
    // Filtrar por grupo: traemos todas y filtramos en código (más simple que un join complejo)
  }

  const { data: clientasData, error } = await queryClientas;
  let clientas = (clientasData ?? []) as unknown as Array<{
    id: string;
    nombre: string;
    apellidos: string | null;
    email: string;
    estado: string;
    creada_en: string;
    clienta_grupos: Array<{ grupo_id: string; grupos: GrupoFila | null }>;
  }>;

  if (grupoFiltroId) {
    clientas = clientas.filter((c) =>
      c.clienta_grupos.some((cg) => cg.grupo_id === grupoFiltroId)
    );
  }

  if (clientas.length === 0) {
    return (
      <div className="p-8 mx-auto max-w-7xl">
        <Header grupos={grupos} grupoActualId={grupoFiltroId} />
        <div className="border border-dashed border-neutral-800 rounded-2xl p-12 text-center">
          <div className="text-neutral-400">
            {grupoFiltroId
              ? "Ninguna clienta en este grupo."
              : "Aún no tienes clientas activas."}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 mx-auto max-w-7xl">
        <Header grupos={grupos} grupoActualId={grupoFiltroId} />
        <div className="text-sm text-red-400">{error.message}</div>
      </div>
    );
  }

  // Para cada clienta, calcular sus métricas en paralelo
  const clientaIds = clientas.map((c) => c.id);

  const [
    { data: asignacionesData },
    { data: sesionesData },
    { data: metricasData },
    { data: logrosData },
    { data: mensajesNoLeidosData },
    { data: ultimosMensajesData },
  ] = await Promise.all([
    supabase
      .from("asignaciones")
      .select("clienta_id, fecha_inicio, fecha_fin, estructura_snapshot, programas(nombre)")
      .in("clienta_id", clientaIds)
      .eq("activa", true),
    supabase
      .from("sesiones")
      .select("clienta_id, fecha, completada")
      .in("clienta_id", clientaIds),
    supabase
      .from("metricas")
      .select("clienta_id, tipo, valor, fecha")
      .in("clienta_id", clientaIds)
      .eq("tipo", "peso")
      .order("fecha", { ascending: false }),
    supabase
      .from("logros")
      .select("clienta_id, tipo")
      .in("clienta_id", clientaIds),
    supabase
      .from("mensajes")
      .select("clienta_id, id")
      .in("clienta_id", clientaIds)
      .eq("remitente", "clienta")
      .eq("leido", false),
    supabase
      .from("mensajes")
      .select("clienta_id, enviado_en")
      .in("clienta_id", clientaIds)
      .order("enviado_en", { ascending: false }),
  ]);

  // Index por clienta
  const asignacionPorClienta = new Map<
    string,
    {
      fecha_inicio: string;
      fecha_fin: string | null;
      estructura_snapshot: EstructuraPrograma;
      programa_nombre: string;
    }
  >();
  ((asignacionesData ?? []) as unknown as Array<{
    clienta_id: string;
    fecha_inicio: string;
    fecha_fin: string | null;
    estructura_snapshot: EstructuraPrograma;
    programas: { nombre: string } | null;
  }>).forEach((a) => {
    asignacionPorClienta.set(a.clienta_id, {
      fecha_inicio: a.fecha_inicio,
      fecha_fin: a.fecha_fin,
      estructura_snapshot: a.estructura_snapshot,
      programa_nombre: a.programas?.nombre ?? "Programa",
    });
  });

  const sesionesPorClienta = new Map<string, Array<{ fecha: string; completada: boolean }>>();
  ((sesionesData ?? []) as Array<{
    clienta_id: string;
    fecha: string;
    completada: boolean;
  }>).forEach((s) => {
    const lista = sesionesPorClienta.get(s.clienta_id) ?? [];
    lista.push({ fecha: s.fecha, completada: s.completada });
    sesionesPorClienta.set(s.clienta_id, lista);
  });

  // Métricas de peso ordenadas (más recientes primero)
  const pesosPorClienta = new Map<string, Array<{ valor: number; fecha: string }>>();
  ((metricasData ?? []) as Array<{
    clienta_id: string;
    tipo: string;
    valor: number;
    fecha: string;
  }>).forEach((m) => {
    const lista = pesosPorClienta.get(m.clienta_id) ?? [];
    lista.push({ valor: Number(m.valor), fecha: m.fecha });
    pesosPorClienta.set(m.clienta_id, lista);
  });

  const logrosPorClienta = new Map<string, TipoLogro[]>();
  ((logrosData ?? []) as Array<{ clienta_id: string; tipo: TipoLogro }>).forEach((l) => {
    const lista = logrosPorClienta.get(l.clienta_id) ?? [];
    lista.push(l.tipo);
    logrosPorClienta.set(l.clienta_id, lista);
  });

  const noLeidosPorClienta = new Map<string, number>();
  ((mensajesNoLeidosData ?? []) as Array<{ clienta_id: string }>).forEach((m) => {
    noLeidosPorClienta.set(m.clienta_id, (noLeidosPorClienta.get(m.clienta_id) ?? 0) + 1);
  });

  const ultimoMensajePorClienta = new Map<string, string>();
  ((ultimosMensajesData ?? []) as Array<{ clienta_id: string; enviado_en: string }>).forEach((m) => {
    if (!ultimoMensajePorClienta.has(m.clienta_id)) {
      ultimoMensajePorClienta.set(m.clienta_id, m.enviado_en);
    }
  });

  // Construir filas
  const filas: FilaComparativa[] = clientas.map((c) => {
    const asign = asignacionPorClienta.get(c.id);
    const sesiones = sesionesPorClienta.get(c.id) ?? [];
    const sesionesCompletadas = sesiones.filter((s) => s.completada);
    const pesos = pesosPorClienta.get(c.id) ?? [];
    const logros = logrosPorClienta.get(c.id) ?? [];

    let adherencia: ResumenAdherencia | null = null;
    let diasEnPrograma: number | null = null;
    if (asign) {
      const programados = diasProgramadosDeAsignacion(
        asign.fecha_inicio,
        asign.estructura_snapshot,
        hoy
      );
      adherencia = calcularAdherencia(programados, sesiones);
      diasEnPrograma = diasEntre(asign.fecha_inicio, hoy);
    }

    // Días sin entrenar = días desde la última sesión completada
    const ultimaSesionCompletada = sesionesCompletadas.sort((a, b) =>
      b.fecha.localeCompare(a.fecha)
    )[0];
    const diasSinEntrenar = ultimaSesionCompletada
      ? diasEntre(ultimaSesionCompletada.fecha, hoy)
      : null;

    // Peso: último + delta vs primero
    const pesoUltimo = pesos[0]?.valor ?? null;
    const pesoPrimero = pesos[pesos.length - 1]?.valor ?? null;
    const deltaPeso =
      pesoUltimo !== null && pesoPrimero !== null && pesos.length >= 2
        ? Number((pesoUltimo - pesoPrimero).toFixed(1))
        : null;

    // Días sin contactar (vs último mensaje en cualquier dirección)
    const ultimoMsg = ultimoMensajePorClienta.get(c.id);
    const diasSinContactar = ultimoMsg
      ? diasEntre(ultimoMsg.slice(0, 10), hoy)
      : null;

    const xp = calcularXpTotal(logros);
    const nivel = calcularNivel(xp);

    return {
      id: c.id,
      nombre: c.nombre,
      apellidos: c.apellidos,
      estado: c.estado,
      grupos: c.clienta_grupos.map((cg) => cg.grupos).filter((g): g is GrupoFila => !!g),
      programaNombre: asign?.programa_nombre ?? null,
      diasEnPrograma,
      adherencia: adherencia?.porcentajeAdherencia ?? null,
      rachaActual: adherencia?.rachaActual ?? 0,
      rachaMaxima: adherencia?.rachaMaxima ?? 0,
      sesionesCompletadas: sesionesCompletadas.length,
      diasSinEntrenar,
      pesoUltimo,
      deltaPeso,
      mensajesNoLeidos: noLeidosPorClienta.get(c.id) ?? 0,
      diasSinContactar,
      xp,
      nivel: nivel.nivel,
      nivelNombre: nivel.nombre,
      numLogros: logros.length,
    };
  });

  // KPIs agregados
  const totalActivas = filas.length;
  const adherenciasValidas = filas.map((f) => f.adherencia).filter((a): a is number => a !== null);
  const adherenciaMedia =
    adherenciasValidas.length > 0
      ? Math.round(
          adherenciasValidas.reduce((a, b) => a + b, 0) / adherenciasValidas.length
        )
      : 0;
  const sesionesUltimaSemana = filas.reduce((acc, f) => {
    const sesiones = sesionesPorClienta.get(f.id) ?? [];
    const desde = fechaISO(new Date(Date.now() - 7 * 24 * 3600 * 1000));
    return acc + sesiones.filter((s) => s.completada && s.fecha >= desde).length;
  }, 0);
  const totalMensajesNoLeidos = filas.reduce((acc, f) => acc + f.mensajesNoLeidos, 0);
  const enRiesgo = filas.filter(
    (f) => f.diasSinEntrenar !== null && f.diasSinEntrenar >= 5
  ).length;

  return (
    <div className="p-8 mx-auto max-w-7xl">
      <Header grupos={grupos} grupoActualId={grupoFiltroId} />

      {/* KPIs agregados */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <Kpi label="Clientas" valor={totalActivas} />
        <Kpi
          label="Adherencia media"
          valor={`${adherenciaMedia}%`}
          color={
            adherenciaMedia >= 80
              ? "verde"
              : adherenciaMedia >= 50
              ? "amber"
              : "rojo"
          }
        />
        <Kpi label="Sesiones esta semana" valor={sesionesUltimaSemana} />
        <Kpi
          label="En riesgo (5d+)"
          valor={enRiesgo}
          color={enRiesgo > 0 ? "amber" : "neutral"}
        />
        <Kpi
          label="Mensajes pendientes"
          valor={totalMensajesNoLeidos}
          color={totalMensajesNoLeidos > 0 ? "amber" : "neutral"}
        />
      </div>

      <TablaComparativa filas={filas} />
    </div>
  );
}

function Header({
  grupos,
  grupoActualId,
}: {
  grupos: GrupoFila[];
  grupoActualId: string | undefined;
}) {
  return (
    <>
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <Link
            href="/clientas"
            className="text-sm text-neutral-400 hover:text-neutral-200"
          >
            ← Clientas
          </Link>
          <h1 className="text-2xl font-semibold mt-2">Comparativa</h1>
          <p className="text-sm text-neutral-400 mt-1">
            Compara adherencia, racha, evolución y comunicación entre tus
            clientas. Click en cualquier columna para ordenar.
          </p>
        </div>
      </div>

      {grupos.length > 0 && (
        <div className="flex gap-1 flex-wrap mb-4">
          <Link
            href="/clientas/comparativa"
            className={
              "text-xs px-3 py-1 rounded-full border " +
              (!grupoActualId
                ? "bg-brand-600 border-brand-600 text-white"
                : "border-neutral-800 text-neutral-400 hover:text-white")
            }
          >
            Todas
          </Link>
          {grupos.map((g) => (
            <Link
              key={g.id}
              href={`/clientas/comparativa?grupo=${g.id}`}
              className={
                "text-xs px-3 py-1 rounded-full border inline-flex items-center gap-1.5 " +
                (grupoActualId === g.id
                  ? "bg-brand-600 border-brand-600 text-white"
                  : "border-neutral-800 text-neutral-400 hover:text-white")
              }
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: g.color ?? "#737373" }}
              />
              {g.nombre}
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

function Kpi({
  label,
  valor,
  color = "neutral",
}: {
  label: string;
  valor: string | number;
  color?: "neutral" | "verde" | "amber" | "rojo";
}) {
  const colores = {
    neutral: "border-neutral-800",
    verde: "border-green-900/50 bg-green-950/20",
    amber: "border-amber-900/50 bg-amber-950/20",
    rojo: "border-red-900/50 bg-red-950/20",
  };
  return (
    <div className={"border rounded-2xl p-4 " + colores[color]}>
      <div className="text-xs uppercase tracking-wide text-neutral-500">
        {label}
      </div>
      <div className="text-2xl font-semibold mt-1">{valor}</div>
    </div>
  );
}
