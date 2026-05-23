// ============================================================================
// POST /api/ia/resumen-clienta
// ----------------------------------------------------------------------------
// Genera un brief en lenguaje natural sobre la situación actual de una clienta:
// programa, adherencia, evolución de métricas, mensajes recientes y notas
// internas. Devuelve un texto markdown corto con observaciones y
// recomendaciones de acción.
//
// Body: { clientaId: string }
// Respuesta: { ok: true, resumen: string }
// ============================================================================

import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { EstructuraPrograma } from "@/lib/supabase/tipos";
import {
  diasProgramadosDeAsignacion,
  calcularAdherencia,
} from "@/lib/adherencia";

const SYSTEM_PROMPT = `Eres una asistente analítica de una entrenadora personal. Tu trabajo es resumir, en pocas líneas, la situación actual de UNA clienta concreta para que la entrenadora se ponga al día en 30 segundos antes de hablar con ella.

# Cómo escribes
- En español de España, tono profesional pero cercano.
- Breve y concreto. Nada de relleno, nada de "¡buenos días!", nada de listas largas.
- Markdown ligero (usa **negrita** para destacar lo importante).
- Maximo ~250 palabras.

# Qué incluyes (en este orden)
1. **Estado actual** en una frase: dónde está la clienta en su programa.
2. **Adherencia y evolución**: % de sesiones completadas, racha, qué dicen los datos de peso/medidas.
3. **Mensajes recientes**: qué ha contado la clienta últimamente (lesiones, dudas, dificultades, motivación).
4. **Notas internas**: lo que tú misma anotaste recientemente (si hay).
5. **Recomendaciones de acción** (2-3 puntos concretos). Ej: "Pregúntale por la molestia lumbar que mencionó el día 12", "Ajustar peso del hip thrust la próxima semana", "Llamarla — no contesta desde hace 5 días".

# Qué evitas
- Diagnósticos médicos.
- Suposiciones sin datos (si no hay info, di "Sin datos de X").
- Halagos vacíos ("¡Va genial!").
- Recetas o pautas nutricionales.

# Formato exacto
Empieza directamente con el resumen (sin saludo). Termina con un bloque "## Para hoy" con 2-3 bullets de acción.`;

function fechaISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { ok: false, error: "Falta ANTHROPIC_API_KEY en Vercel." },
      { status: 500 }
    );
  }

  let body: { clientaId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido." }, { status: 400 });
  }
  const clientaId = String(body.clientaId ?? "").trim();
  if (!clientaId) {
    return NextResponse.json({ ok: false, error: "Falta clientaId." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "No autenticada." }, { status: 401 });
  }

  // Reunir contexto
  const { data: clienta } = await supabase
    .from("clientas")
    .select(
      "id, nombre, apellidos, fecha_nacimiento, estado, notas_publicas, creada_en"
    )
    .eq("id", clientaId)
    .maybeSingle();
  if (!clienta) {
    return NextResponse.json({ ok: false, error: "Clienta no encontrada." }, { status: 404 });
  }

  const [
    { data: asignacionData },
    { data: metricasData },
    { data: sesionesData },
    { data: mensajesData },
    { data: notasData },
  ] = await Promise.all([
    supabase
      .from("asignaciones")
      .select(
        "id, fecha_inicio, fecha_fin, estructura_snapshot, programas(nombre)"
      )
      .eq("clienta_id", clientaId)
      .eq("activa", true)
      .order("creada_en", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("metricas")
      .select("tipo, valor, unidad, fecha")
      .eq("clienta_id", clientaId)
      .order("fecha", { ascending: false })
      .limit(30),
    supabase
      .from("sesiones")
      .select("fecha, completada")
      .eq("clienta_id", clientaId)
      .order("fecha", { ascending: false })
      .limit(60),
    supabase
      .from("mensajes")
      .select("remitente, contenido, enviado_en")
      .eq("clienta_id", clientaId)
      .order("enviado_en", { ascending: false })
      .limit(20),
    supabase
      .from("notas")
      .select("contenido, creada_en")
      .eq("clienta_id", clientaId)
      .order("creada_en", { ascending: false })
      .limit(10),
  ]);

  const asignacion = asignacionData as {
    id: string;
    fecha_inicio: string;
    fecha_fin: string | null;
    estructura_snapshot: EstructuraPrograma;
    programas: { nombre: string } | null;
  } | null;

  let adherenciaTexto = "Sin programa asignado.";
  if (asignacion) {
    const hoy = fechaISO(new Date());
    const programados = diasProgramadosDeAsignacion(
      asignacion.fecha_inicio,
      asignacion.estructura_snapshot,
      hoy
    );
    const ad = calcularAdherencia(programados, (sesionesData ?? []) as Array<{ fecha: string; completada: boolean }>);
    adherenciaTexto = `Programa: ${asignacion.programas?.nombre ?? "(sin nombre)"} (inicio ${asignacion.fecha_inicio}${asignacion.fecha_fin ? `, fin ${asignacion.fecha_fin}` : ""}). Sesiones completadas: ${ad.sesionesCompletadas}/${ad.sesionesProgramadas} (${ad.porcentajeAdherencia}%). Racha actual: ${ad.rachaActual} días. Mejor racha: ${ad.rachaMaxima}.`;
  }

  const metricasResumen =
    (metricasData ?? []).length === 0
      ? "Sin métricas registradas."
      : (metricasData ?? [])
          .slice(0, 12)
          .map(
            (m) =>
              `${m.tipo.replace(/_/g, " ")}: ${m.valor} ${m.unidad} (${m.fecha})`
          )
          .join("\n");

  const mensajesResumen =
    (mensajesData ?? []).length === 0
      ? "Sin mensajes."
      : (mensajesData ?? [])
          .reverse()
          .map(
            (m) =>
              `[${m.enviado_en.slice(0, 10)}] ${m.remitente === "coach" ? "TÚ" : "Clienta"}: ${m.contenido.slice(0, 200)}`
          )
          .join("\n");

  const notasResumen =
    (notasData ?? []).length === 0
      ? "Sin notas internas."
      : (notasData ?? [])
          .map((n) => `[${n.creada_en.slice(0, 10)}] ${n.contenido}`)
          .join("\n");

  const edad = clienta.fecha_nacimiento
    ? Math.floor(
        (Date.now() - new Date(clienta.fecha_nacimiento).getTime()) /
          (365.25 * 24 * 3600 * 1000)
      )
    : null;

  const userPrompt = `# Clienta
${clienta.nombre} ${clienta.apellidos ?? ""}${
    edad !== null ? `, ${edad} años` : ""
  }. Estado: ${clienta.estado}. Alta: ${clienta.creada_en.slice(0, 10)}.
${clienta.notas_publicas ? `Notas visibles para la clienta:\n${clienta.notas_publicas}\n` : ""}
# Programa y adherencia
${adherenciaTexto}

# Métricas (más recientes primero)
${metricasResumen}

# Conversación reciente (cronológico)
${mensajesResumen}

# Notas internas (más recientes primero)
${notasResumen}

Genera el resumen siguiendo las reglas del system prompt.`;

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  try {
    const message = await anthropic.messages.create({
      model: "claude-opus-4-7",
      max_tokens: 1024,
      thinking: { type: "adaptive" },
      output_config: { effort: "medium" },
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: userPrompt }],
    });

    const texto = message.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();

    return NextResponse.json({ ok: true, resumen: texto });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Error desconocido.",
      },
      { status: 502 }
    );
  }
}
