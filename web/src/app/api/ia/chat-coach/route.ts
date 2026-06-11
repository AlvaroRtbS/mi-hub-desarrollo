// ============================================================================
// POST /api/ia/chat-coach
// ----------------------------------------------------------------------------
// Asistente del entrenador: responde preguntas en lenguaje natural sobre SUS
// clientas usando un snapshot de datos reales (adherencia, última actividad,
// peso, check-ins, mensajes sin leer). Motor: Gemini free.
//
// Body: { pregunta: string, historial?: {role:"user"|"assistant", content:string}[] }
// Respuesta: { ok: true, respuesta: string }
// ============================================================================

import { NextResponse } from "next/server";
import { generarTextoGemini } from "@/lib/gemini";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { lunesDeEstaSemana } from "@/lib/checkin";
import { hoyISO } from "@/lib/utilidades";

const SYSTEM_PROMPT = `Eres la asistente del entrenador dentro de su plataforma de gestión de clientas. Respondes preguntas sobre SUS clientas usando ÚNICAMENTE los datos del snapshot que se te pasa.

# Reglas
- Español de España, tono profesional y directo. Conciso (markdown ligero, listas cuando ayude).
- Usa SOLO los datos del snapshot. Si te preguntan algo que no está en los datos, dilo claramente ("No tengo ese dato").
- Si preguntan "quién necesita atención", prioriza: sin entrenar hace muchos días, adherencia baja, mensajes sin leer, check-in pendiente.
- Para evolución de métricas, cada clienta trae sus métricas como "tipo valor (Δ vs fecha)": Δ negativo = ha BAJADO, Δ positivo = ha SUBIDO. Agrupa quién baja, quién sube y quién se mantiene, con la cifra.
- No inventes nombres ni cifras. No des consejo médico.
- Si la pregunta es ambigua, responde con lo más útil y ofrece concretar.`;

export async function POST(request: Request) {
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ ok: false, error: "Falta GEMINI_API_KEY en Vercel." }, { status: 500 });
  }

  let body: { pregunta?: string; historial?: { role: string; content: string }[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido." }, { status: 400 });
  }
  const pregunta = String(body.pregunta ?? "").trim();
  if (!pregunta) return NextResponse.json({ ok: false, error: "Falta la pregunta." }, { status: 400 });

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "No autenticada." }, { status: 401 });

  const { data: coach } = await supabase
    .from("coaches")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle<{ id: string }>();
  if (!coach) return NextResponse.json({ ok: false, error: "Coach no encontrada." }, { status: 404 });

  // ----- Snapshot de clientas (RLS limita al coach) -----
  const hoy = hoyISO();
  const lunes = lunesDeEstaSemana();
  const hace30 = new Date();
  hace30.setDate(hace30.getDate() - 30);
  const desde30 = hace30.toISOString().slice(0, 10);
  // Ventana de métricas: 21 días (para tener un punto de referencia de ~1
  // semana atrás aunque la clienta no se pese a diario) y el corte de "hace 7d".
  const hace21 = new Date();
  hace21.setDate(hace21.getDate() - 21);
  const desde21 = hace21.toISOString().slice(0, 10);
  const hace7 = new Date();
  hace7.setDate(hace7.getDate() - 7);
  const limite7 = hace7.toISOString().slice(0, 10);

  const { data: clientas } = await supabase
    .from("clientas")
    .select("id, nombre, apellidos, estado")
    .neq("estado", "archivada")
    .order("nombre")
    .returns<{ id: string; nombre: string; apellidos: string | null; estado: string }[]>();

  const ids = (clientas ?? []).map((c) => c.id);
  const idsSafe = ids.length ? ids : ["00000000-0000-0000-0000-000000000000"];

  const [{ data: sesiones }, { data: metricas }, { data: checkins }, { data: noLeidos }] =
    await Promise.all([
      supabase
        .from("sesiones")
        .select("clienta_id, fecha, completada")
        .in("clienta_id", idsSafe)
        .gte("fecha", desde30),
      supabase
        .from("metricas")
        .select("clienta_id, tipo, valor, unidad, fecha")
        .in("clienta_id", idsSafe)
        .gte("fecha", desde21)
        .order("fecha", { ascending: true }),
      supabase
        .from("checkins")
        .select("clienta_id")
        .eq("semana", lunes)
        .in("clienta_id", idsSafe),
      supabase
        .from("mensajes")
        .select("clienta_id")
        .eq("remitente", "clienta")
        .eq("leido", false)
        .in("clienta_id", idsSafe),
    ]);

  const sesPorClienta = new Map<string, { fecha: string; completada: boolean }[]>();
  for (const s of sesiones ?? []) {
    const l = sesPorClienta.get(s.clienta_id) ?? [];
    l.push(s);
    sesPorClienta.set(s.clienta_id, l);
  }
  // Métricas agrupadas por clienta → tipo → series (orden ascendente por fecha).
  type PuntoMetrica = { valor: number; unidad: string; fecha: string };
  type MetricaFila = {
    clienta_id: string;
    tipo: string;
    valor: number | string;
    unidad: string | null;
    fecha: string;
  };
  const metricasPorClienta = new Map<string, Map<string, PuntoMetrica[]>>();
  for (const m of (metricas ?? []) as MetricaFila[]) {
    const porTipo = metricasPorClienta.get(m.clienta_id) ?? new Map<string, PuntoMetrica[]>();
    const serie = porTipo.get(m.tipo) ?? [];
    serie.push({ valor: Number(m.valor), unidad: m.unidad ?? "", fecha: m.fecha });
    porTipo.set(m.tipo, serie);
    metricasPorClienta.set(m.clienta_id, porTipo);
  }

  /** Resumen "tipo valor (Δ vs fecha)" por clienta, con el peso primero. */
  function resumenMetricas(clientaId: string): string {
    const porTipo = metricasPorClienta.get(clientaId);
    if (!porTipo || porTipo.size === 0) return "sin métricas (21d)";
    const tipos = [...porTipo.keys()].sort((a, b) =>
      a === "peso" ? -1 : b === "peso" ? 1 : a.localeCompare(b)
    );
    const partes: string[] = [];
    for (const tipo of tipos) {
      const serie = porTipo.get(tipo)!;
      const latest = serie[serie.length - 1]!;
      // Referencia: el punto más reciente con al menos ~7 días de antigüedad;
      // si no hay, el más antiguo de la ventana.
      let baseline = serie[0]!;
      for (const e of serie) if (e.fecha <= limite7) baseline = e;
      const u = latest.unidad;
      if (baseline.fecha === latest.fecha) {
        partes.push(`${tipo} ${latest.valor}${u} (1 dato)`);
      } else {
        const d = latest.valor - baseline.valor;
        const signo = d > 0 ? "+" : "";
        partes.push(
          `${tipo} ${latest.valor}${u} (${signo}${d.toFixed(1)} vs ${baseline.fecha})`
        );
      }
    }
    return partes.join("; ");
  }
  const checkinSet = new Set((checkins ?? []).map((c) => c.clienta_id));
  const noLeidosCount = new Map<string, number>();
  for (const m of noLeidos ?? []) {
    noLeidosCount.set(m.clienta_id, (noLeidosCount.get(m.clienta_id) ?? 0) + 1);
  }

  function diasDesde(fecha: string): number {
    return Math.floor((new Date(hoy).getTime() - new Date(fecha).getTime()) / 86400000);
  }

  const lineas = (clientas ?? []).map((c) => {
    const ses = sesPorClienta.get(c.id) ?? [];
    const completadas = ses.filter((s) => s.completada);
    const ultima = completadas.map((s) => s.fecha).sort().pop();
    const estaSemana = completadas.filter((s) => s.fecha >= lunes).length;
    const sinEntrenar = ultima ? `hace ${diasDesde(ultima)} d` : "sin sesiones (30d)";
    const noLe = noLeidosCount.get(c.id) ?? 0;
    return `- ${c.nombre} ${c.apellidos ?? ""} [${c.estado}]: últ. entreno ${sinEntrenar}; ${completadas.length} entrenos/30d, ${estaSemana} esta semana; ${resumenMetricas(c.id)}; check-in semana ${checkinSet.has(c.id) ? "hecho" : "PENDIENTE"}; ${noLe > 0 ? `${noLe} mensaje(s) SIN LEER` : "sin mensajes pendientes"}`;
  });

  const historialTexto = (body.historial ?? [])
    .slice(-6)
    .map((m) => `${m.role === "user" ? "Entrenador" : "Asistente"}: ${m.content}`)
    .join("\n");

  const userPrompt = `# Snapshot de clientas (hoy ${hoy})
${lineas.join("\n") || "(sin clientas)"}

${historialTexto ? `# Conversación previa\n${historialTexto}\n` : ""}
# Pregunta del entrenador
${pregunta}

Responde usando solo el snapshot.`;

  try {
    const respuesta = await generarTextoGemini({
      system: SYSTEM_PROMPT,
      user: userPrompt,
      maxTokens: 1024,
    });
    return NextResponse.json({ ok: true, respuesta });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Error de la IA." },
      { status: 502 }
    );
  }
}
