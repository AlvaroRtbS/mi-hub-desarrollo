// ============================================================================
// POST /api/ia/informe-semanal
// ----------------------------------------------------------------------------
// Brief SEMANAL para el coach: un digest de los últimos 7 días de TODAS las
// clientas activas (entrenos, peso, pasos, check-in, contacto) + un narrativo
// con prioridades, generado con Gemini en UNA sola llamada.
//
// Distinto de /api/ia/resumen-clienta (que es un brief profundo de UNA clienta).
// Respuesta: { ok: true, informe: string }
// ============================================================================

import { NextResponse } from "next/server";
import { generarTextoGemini } from "@/lib/gemini";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function fechaISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function diasEntre(a: string, b: string): number {
  return Math.floor(
    (new Date(b + "T00:00:00Z").getTime() - new Date(a + "T00:00:00Z").getTime()) /
      86400000
  );
}

const SYSTEM_PROMPT = `Eres una asistente analítica de un entrenador personal. Te paso un resumen de datos de los últimos 7 días de varias clientas y generas el INFORME SEMANAL que el entrenador lee para planear su semana.

# Cómo escribes
- Español de España, profesional y directo. Sin saludos ni relleno.
- Markdown ligero (**negrita** para nombres y datos clave).
- Una línea por clienta: lo esencial de su semana (entrenos, peso, pasos, contacto). Si una clienta no tiene actividad, dilo en una frase.
- No te inventes datos: si pone "sin datos", refléjalo.
- Nada de diagnósticos médicos ni pautas nutricionales.

# Estructura exacta
1. Una línea por clienta (ordénalas tú: primero las que necesitan atención).
2. Un bloque final "## Prioridades de la semana" con 2-4 bullets accionables: a quién escribir, a quién felicitar, a quién vigilar.`;

export async function POST() {
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json(
      { ok: false, error: "Falta GEMINI_API_KEY en Vercel." },
      { status: 500 }
    );
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "No autenticada." }, { status: 401 });
  }

  const hoy = fechaISO(new Date());
  const hace7 = fechaISO(new Date(Date.now() - 7 * 86400000));
  const hace14 = fechaISO(new Date(Date.now() - 14 * 86400000));
  const hace30 = fechaISO(new Date(Date.now() - 30 * 86400000));
  const ahora = new Date();
  const lunes = new Date(ahora);
  lunes.setUTCDate(ahora.getUTCDate() - ((ahora.getUTCDay() + 6) % 7));
  const lunesISO = fechaISO(lunes);

  const { data: clientasData } = await supabase
    .from("clientas")
    .select("id, nombre, apellidos")
    .eq("estado", "activa")
    .order("nombre");
  const clientas = (clientasData ?? []) as Array<{
    id: string;
    nombre: string;
    apellidos: string | null;
  }>;
  if (clientas.length === 0) {
    return NextResponse.json({ ok: true, informe: "No hay clientas activas." });
  }
  const ids = clientas.map((c) => c.id);

  const [sesRes, pesoRes, pasosRes, chkRes, msgRes] = await Promise.all([
    supabase
      .from("sesiones")
      .select("clienta_id, fecha, completada")
      .in("clienta_id", ids)
      .gte("fecha", hace30)
      .order("fecha", { ascending: false }),
    supabase
      .from("metricas")
      .select("clienta_id, valor, fecha")
      .in("clienta_id", ids)
      .eq("tipo", "peso")
      .gte("fecha", hace14)
      .order("fecha", { ascending: true }),
    supabase
      .from("pasos_diarios")
      .select("clienta_id, pasos, fecha")
      .in("clienta_id", ids)
      .gte("fecha", hace7),
    supabase.from("checkins").select("clienta_id").in("clienta_id", ids).eq("semana", lunesISO),
    supabase
      .from("mensajes")
      .select("clienta_id, remitente, enviado_en")
      .in("clienta_id", ids)
      .order("enviado_en", { ascending: false }),
  ]);

  const ses = (sesRes.data ?? []) as Array<{ clienta_id: string; fecha: string; completada: boolean }>;
  const pesos = (pesoRes.data ?? []) as Array<{ clienta_id: string; valor: number; fecha: string }>;
  const pasos = (pasosRes.data ?? []) as Array<{ clienta_id: string; pasos: number; fecha: string }>;
  const chkSet = new Set(((chkRes.data ?? []) as Array<{ clienta_id: string }>).map((c) => c.clienta_id));
  const msgs = (msgRes.data ?? []) as Array<{ clienta_id: string; remitente: string; enviado_en: string }>;

  const lineas = clientas.map((c) => {
    const nombre = `${c.nombre} ${c.apellidos ?? ""}`.trim();
    const sesCl = ses.filter((s) => s.clienta_id === c.id);
    const entrenosSemana = sesCl.filter((s) => s.completada && s.fecha >= hace7).length;
    const ultimaCompletada = sesCl.find((s) => s.completada);
    const diasSinEntrenar = ultimaCompletada ? diasEntre(ultimaCompletada.fecha, hoy) : null;

    const pesosCl = pesos.filter((p) => p.clienta_id === c.id);
    const pesoTxt =
      pesosCl.length >= 2
        ? `peso ${(pesosCl[pesosCl.length - 1]!.valor - pesosCl[0]!.valor >= 0 ? "+" : "")}${(pesosCl[pesosCl.length - 1]!.valor - pesosCl[0]!.valor).toFixed(1)} kg (14d)`
        : pesosCl.length === 1
          ? `peso ${pesosCl[0]!.valor} kg`
          : "sin peso 14d";

    const pasosCl = pasos.filter((p) => p.clienta_id === c.id);
    const pasosTxt = pasosCl.length
      ? `pasos media ${Math.round(pasosCl.reduce((a, p) => a + p.pasos, 0) / pasosCl.length).toLocaleString("es-ES")}`
      : "sin pasos";

    const ultClienta = msgs.find((m) => m.clienta_id === c.id && m.remitente === "clienta");
    const ultCoach = msgs.find((m) => m.clienta_id === c.id && m.remitente === "coach");
    const pendiente = ultClienta && (!ultCoach || ultClienta.enviado_en > ultCoach.enviado_en);

    return `- ${nombre}: ${entrenosSemana} entrenos (7d)${
      diasSinEntrenar != null ? `, último hace ${diasSinEntrenar}d` : ", sin entrenos registrados"
    }, ${pesoTxt}, ${pasosTxt}, check-in semana ${chkSet.has(c.id) ? "sí" : "no"}${
      pendiente ? ", ⚠ MENSAJE SIN RESPONDER" : ""
    }.`;
  });

  const userPrompt = `Semana hasta ${hoy} (datos de los últimos 7-14 días). ${clientas.length} clientas activas.

${lineas.join("\n")}

Genera el informe semanal siguiendo las reglas del system prompt.`;

  try {
    const informe = await generarTextoGemini({
      system: SYSTEM_PROMPT,
      user: userPrompt,
      maxTokens: 1500,
    });
    return NextResponse.json({ ok: true, informe });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Error desconocido." },
      { status: 502 }
    );
  }
}
