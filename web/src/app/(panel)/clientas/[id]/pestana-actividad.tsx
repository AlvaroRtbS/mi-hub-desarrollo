import { createSupabaseServerClient } from "@/lib/supabase/server";
import { LOGROS, type TipoLogro } from "@/lib/gamificacion";

type Evento = {
  id: string;
  fecha: string; // ISO datetime
  tipo:
    | "sesion_completada"
    | "sesion_no_completada"
    | "foto"
    | "metrica"
    | "mensaje_clienta"
    | "mensaje_coach"
    | "logro"
    | "objetivo_conseguido"
    | "nota_interna"
    | "todo_completado";
  titulo: string;
  detalle?: string;
  icono: string;
  color: "verde" | "azul" | "amarillo" | "morado" | "naranja" | "gris";
};

export async function PestanaActividad({ clientaId }: { clientaId: string }) {
  const supabase = await createSupabaseServerClient();

  // En paralelo, traemos lo más reciente de cada tipo. 30 por tipo es suficiente
  // para construir un timeline rico sin sobrecargar.
  const [
    { data: sesiones },
    { data: fotos },
    { data: metricas },
    { data: mensajes },
    { data: logros },
    { data: objetivos },
    { data: notas },
    { data: todos },
  ] = await Promise.all([
    supabase
      .from("sesiones")
      .select("id, fecha, completada, porcentaje_completado, notas_clienta, actualizada_en")
      .eq("clienta_id", clientaId)
      .order("fecha", { ascending: false })
      .limit(30),
    supabase
      .from("fotos_progreso")
      .select("id, fecha, tipo, subida_en")
      .eq("clienta_id", clientaId)
      .order("fecha", { ascending: false })
      .limit(20),
    supabase
      .from("metricas")
      .select("id, tipo, valor, unidad, fecha, creada_en")
      .eq("clienta_id", clientaId)
      .order("fecha", { ascending: false })
      .limit(30),
    supabase
      .from("mensajes")
      .select("id, remitente, contenido, enviado_en")
      .eq("clienta_id", clientaId)
      .order("enviado_en", { ascending: false })
      .limit(20),
    supabase
      .from("logros")
      .select("tipo, conseguido_en")
      .eq("clienta_id", clientaId)
      .order("conseguido_en", { ascending: false })
      .limit(20),
    supabase
      .from("objetivos")
      .select("id, titulo, conseguido_en")
      .eq("clienta_id", clientaId)
      .eq("estado", "conseguido")
      .order("conseguido_en", { ascending: false })
      .limit(20),
    supabase
      .from("notas")
      .select("id, contenido, creada_en")
      .eq("clienta_id", clientaId)
      .order("creada_en", { ascending: false })
      .limit(15),
    supabase
      .from("todos_clienta")
      .select("id, titulo, completado_en")
      .eq("clienta_id", clientaId)
      .eq("completado", true)
      .order("completado_en", { ascending: false })
      .limit(15),
  ]);

  const eventos: Evento[] = [];

  for (const s of sesiones ?? []) {
    const completada = (s as { completada?: boolean }).completada ?? false;
    const fechaUsada =
      (s as { actualizada_en?: string | null }).actualizada_en ??
      `${(s as { fecha: string }).fecha}T12:00:00Z`;
    eventos.push({
      id: `sesion-${(s as { id: string }).id}`,
      fecha: fechaUsada,
      tipo: completada ? "sesion_completada" : "sesion_no_completada",
      titulo: completada
        ? "Sesión completada"
        : "Sesión registrada (incompleta)",
      detalle:
        (s as { notas_clienta?: string | null }).notas_clienta ??
        (typeof (s as { porcentaje_completado?: number }).porcentaje_completado === "number"
          ? `${(s as { porcentaje_completado?: number }).porcentaje_completado}% completado`
          : undefined),
      icono: completada ? "✓" : "○",
      color: completada ? "verde" : "gris",
    });
  }

  for (const f of fotos ?? []) {
    eventos.push({
      id: `foto-${(f as { id: string }).id}`,
      fecha:
        (f as { subida_en?: string }).subida_en ??
        `${(f as { fecha: string }).fecha}T12:00:00Z`,
      tipo: "foto",
      titulo: "Foto de progreso",
      detalle: (f as { tipo?: string | null }).tipo ?? undefined,
      icono: "📸",
      color: "morado",
    });
  }

  for (const m of metricas ?? []) {
    eventos.push({
      id: `metrica-${(m as { id: string }).id}`,
      fecha: (m as { creada_en?: string; fecha: string }).creada_en ?? (m as { fecha: string }).fecha,
      tipo: "metrica",
      titulo: `Métrica · ${(m as { tipo: string }).tipo.replace(/_/g, " ")}`,
      detalle: `${(m as { valor: number }).valor} ${(m as { unidad: string }).unidad}`,
      icono: "📊",
      color: "azul",
    });
  }

  for (const msg of mensajes ?? []) {
    const remitente = (msg as { remitente: string }).remitente;
    eventos.push({
      id: `msg-${(msg as { id: string }).id}`,
      fecha: (msg as { enviado_en: string }).enviado_en,
      tipo: remitente === "clienta" ? "mensaje_clienta" : "mensaje_coach",
      titulo: remitente === "clienta" ? "Mensaje de la clienta" : "Mensaje enviado",
      detalle: truncar((msg as { contenido: string }).contenido, 120),
      icono: "💬",
      color: remitente === "clienta" ? "amarillo" : "gris",
    });
  }

  for (const l of logros ?? []) {
    const tipo = (l as { tipo: TipoLogro }).tipo;
    const def = LOGROS[tipo];
    eventos.push({
      id: `logro-${tipo}-${(l as { conseguido_en: string }).conseguido_en}`,
      fecha: (l as { conseguido_en: string }).conseguido_en,
      tipo: "logro",
      titulo: `Logro: ${def?.nombre ?? tipo}`,
      detalle: def?.descripcion,
      icono: def?.emoji ?? "🏆",
      color: "naranja",
    });
  }

  for (const o of objetivos ?? []) {
    if (!(o as { conseguido_en: string | null }).conseguido_en) continue;
    eventos.push({
      id: `obj-${(o as { id: string }).id}`,
      fecha: (o as { conseguido_en: string }).conseguido_en,
      tipo: "objetivo_conseguido",
      titulo: `Objetivo conseguido`,
      detalle: (o as { titulo: string }).titulo,
      icono: "🎯",
      color: "verde",
    });
  }

  for (const n of notas ?? []) {
    eventos.push({
      id: `nota-${(n as { id: string }).id}`,
      fecha: (n as { creada_en: string }).creada_en,
      tipo: "nota_interna",
      titulo: "Nota interna",
      detalle: truncar((n as { contenido: string }).contenido, 120),
      icono: "📝",
      color: "gris",
    });
  }

  for (const t of todos ?? []) {
    if (!(t as { completado_en: string | null }).completado_en) continue;
    eventos.push({
      id: `todo-${(t as { id: string }).id}`,
      fecha: (t as { completado_en: string }).completado_en,
      tipo: "todo_completado",
      titulo: "Tarea completada",
      detalle: (t as { titulo: string }).titulo,
      icono: "✔",
      color: "verde",
    });
  }

  // Ordenar por fecha descendente y quedarse con los primeros 80
  eventos.sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
  const top = eventos.slice(0, 80);

  if (top.length === 0) {
    return (
      <div className="border border-dashed border-neutral-800 rounded-2xl p-12 text-center">
        <div className="text-neutral-400">Sin actividad registrada todavía.</div>
        <div className="text-sm text-neutral-500 mt-2">
          Cuando la clienta complete sesiones, registre métricas o suba fotos, aparecerá aquí.
        </div>
      </div>
    );
  }

  // Agrupar por sección temporal
  const grupos = agruparPorSeccion(top);

  return (
    <div className="space-y-6">
      {grupos.map((g) => (
        <div key={g.label}>
          <div className="text-xs uppercase tracking-wide text-neutral-500 mb-3">
            {g.label}
          </div>
          <ul className="space-y-1.5">
            {g.eventos.map((e) => (
              <FilaEvento key={e.id} evento={e} />
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function FilaEvento({ evento }: { evento: Evento }) {
  const colores: Record<Evento["color"], string> = {
    verde: "bg-green-950/40 border-green-900/50 text-green-400",
    azul: "bg-blue-950/40 border-blue-900/50 text-blue-400",
    amarillo: "bg-amber-950/40 border-amber-900/50 text-amber-400",
    morado: "bg-purple-950/40 border-purple-900/50 text-purple-400",
    naranja: "bg-orange-950/40 border-orange-900/50 text-orange-400",
    gris: "bg-neutral-900 border-neutral-800 text-neutral-400",
  };

  return (
    <li className="flex items-start gap-3 px-3 py-2 rounded-lg hover:bg-neutral-900/30 transition">
      <div
        className={
          "w-8 h-8 rounded-full border flex items-center justify-center text-sm flex-shrink-0 " +
          colores[evento.color]
        }
      >
        {evento.icono}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-neutral-100">{evento.titulo}</div>
        {evento.detalle && (
          <div className="text-xs text-neutral-500 truncate">{evento.detalle}</div>
        )}
      </div>
      <div className="text-[10px] text-neutral-600 flex-shrink-0">
        {formatearHora(evento.fecha)}
      </div>
    </li>
  );
}

function truncar(texto: string, n: number): string {
  if (texto.length <= n) return texto;
  return texto.slice(0, n).trim() + "…";
}

function formatearHora(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}

function agruparPorSeccion(eventos: Evento[]): Array<{
  label: string;
  eventos: Evento[];
}> {
  const hoy = new Date(new Date().toISOString().slice(0, 10));
  const ayer = new Date(hoy.getTime() - 86400000);
  const semana = new Date(hoy.getTime() - 7 * 86400000);
  const mes = new Date(hoy.getTime() - 30 * 86400000);

  const buckets: Record<string, Evento[]> = {
    Hoy: [],
    Ayer: [],
    "Esta semana": [],
    "Este mes": [],
    Anterior: [],
  };

  for (const e of eventos) {
    const f = new Date(e.fecha);
    const dia = new Date(f.toISOString().slice(0, 10));
    if (dia.getTime() === hoy.getTime()) buckets.Hoy.push(e);
    else if (dia.getTime() === ayer.getTime()) buckets.Ayer.push(e);
    else if (dia >= semana) buckets["Esta semana"].push(e);
    else if (dia >= mes) buckets["Este mes"].push(e);
    else buckets.Anterior.push(e);
  }

  return Object.entries(buckets)
    .filter(([, evs]) => evs.length > 0)
    .map(([label, evs]) => ({ label, eventos: evs }));
}
