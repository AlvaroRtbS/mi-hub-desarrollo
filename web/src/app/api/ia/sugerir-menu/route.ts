// ============================================================================
// POST /api/ia/sugerir-menu
// ----------------------------------------------------------------------------
// Sugiere un menú concreto por toma a partir del reparto de raciones del plan
// (método de equivalencias), la tabla de alimentos del coach y las preferencias
// / intolerancias de la clienta (de su Formulario Inicial). Devuelve, por cada
// toma, una lista de líneas de menú (platos con cantidades).
//
// Body: { tomas: Toma[], clientaId?: string | null }
// Respuesta: { ok: true, tomas: { id: string; menu: string[] }[] }
// ============================================================================

import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Toma, CategoriaRacion } from "@/lib/nutricion";

const SYSTEM_PROMPT = `Eres la asistente nutricional de un entrenador que trabaja con el MÉTODO DE EQUIVALENCIAS europeo (1 ración = 10 g del macro principal). Tu tarea: proponer un MENÚ CONCRETO para cada toma del día, a partir del reparto de raciones que te doy y de la tabla de alimentos disponible.

# Reglas del método (OBLIGATORIO respetarlas)
- Cada toma indica cuántas raciones de HC, P (proteína), G (grasa) y V (verdura) debe sumar. Elige alimentos REALES de la tabla cuya suma cuadre con esas raciones (±0.5).
- El AOVE es la grasa principal: usa aceite de oliva para cocinar/aliñar siempre que haya raciones G en comidas saladas.
- Toda toma con proteína debe llevar al menos 1 fuente proteica.
- Verdura abundante en comida y cena.
- Varía los alimentos entre tomas y entre días (no repitas pollo+arroz en todas).
- Respeta ESCRUPULOSAMENTE las intolerancias, alergias y alimentos que la clienta no tolera. Si dice "no como pescado", no pongas pescado. Si es intolerante a la lactosa, evita lácteos con lactosa.
- Si no hay clienta o no hay preferencias, propón un menú equilibrado tipo mediterráneo.

# Formato de salida (OBLIGATORIO)
Devuelve SOLO un objeto JSON válido, sin texto antes ni después, con esta forma exacta:
{"tomas":[{"id":"t1","menu":["línea 1","línea 2"]}, ...]}
- Una entrada por cada toma que te paso, con su MISMO id.
- "menu" es un array de líneas cortas en español. Cada línea es un plato o alimento con su cantidad concreta, p.ej. "150 g pechuga de pollo a la plancha" o "Ensalada de hojas + tomate aliñada con 1 cda de AOVE".
- 2 a 4 líneas por toma. Lenguaje claro para la clienta. Sin explicaciones, sin macros, sin markdown.`;

const ETIQUETA: Record<CategoriaRacion, string> = {
  HC: "hidratos",
  P: "proteína",
  G: "grasa",
  V: "verdura",
};

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { ok: false, error: "Falta ANTHROPIC_API_KEY en Vercel." },
      { status: 500 }
    );
  }

  let body: { tomas?: Toma[]; clientaId?: string | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido." }, { status: 400 });
  }

  const tomas = Array.isArray(body.tomas) ? body.tomas : [];
  if (tomas.length === 0) {
    return NextResponse.json(
      { ok: false, error: "No hay tomas. Calcula primero el reparto." },
      { status: 400 }
    );
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "No autenticada." }, { status: 401 });
  }

  // Tabla de alimentos del coach (RLS la limita al coach logueado).
  const { data: alimentos } = await supabase
    .from("alimentos_equivalencias")
    .select("categoria, subgrupo, alimento, cantidad, notas")
    .order("categoria", { ascending: true })
    .order("orden", { ascending: true })
    .returns<
      {
        categoria: CategoriaRacion;
        subgrupo: string | null;
        alimento: string;
        cantidad: string;
        notas: string | null;
      }[]
    >();

  if (!alimentos || alimentos.length === 0) {
    return NextResponse.json(
      { ok: false, error: "Carga primero la tabla de alimentos (Nutrición → Tabla de alimentos)." },
      { status: 400 }
    );
  }

  const tablaTexto = alimentos
    .map(
      (a) =>
        `- [${ETIQUETA[a.categoria]}] ${a.alimento}: ${a.cantidad}${a.notas ? ` (${a.notas})` : ""}`
    )
    .join("\n");

  // Preferencias de la clienta desde su Formulario Inicial (si está asignada).
  let preferenciasTexto = "Sin clienta asignada: menú equilibrado genérico.";
  const clientaId = body.clientaId ? String(body.clientaId) : null;
  if (clientaId) {
    const { data: fr } = await supabase
      .from("formulario_respuestas")
      .select("respuestas")
      .eq("clienta_id", clientaId)
      .eq("tipo", "inicial")
      .maybeSingle<{ respuestas: Record<string, string> }>();
    const r = fr?.respuestas ?? {};
    const partes: string[] = [];
    if (r.objetivo) partes.push(`Objetivo: ${r.objetivo}`);
    if (r.alimentacion) partes.push(`Alergias / intolerancias / no tolera: ${r.alimentacion}`);
    if (r.algo_mas) partes.push(`Otros: ${r.algo_mas}`);
    preferenciasTexto =
      partes.length > 0
        ? partes.join("\n")
        : "La clienta no ha rellenado el formulario inicial; menú equilibrado genérico.";
  }

  const tomasTexto = tomas
    .map(
      (t) =>
        `- id ${t.id} · ${t.nombre}${t.hora ? ` (${t.hora})` : ""}: ${t.hc} HC, ${t.p} P, ${t.g} G, ${t.v} verdura`
    )
    .join("\n");

  const userPrompt = `# Reparto de raciones por toma
${tomasTexto}

# Preferencias e intolerancias de la clienta
${preferenciasTexto}

# Tabla de alimentos disponible (1 ración cada cantidad indicada)
${tablaTexto}

Devuelve el JSON con el menú de cada toma (mismos ids).`;

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  try {
    const message = await anthropic.messages.create({
      model: "claude-opus-4-7",
      max_tokens: 2048,
      thinking: { type: "adaptive" },
      output_config: { effort: "medium" },
      system: [
        { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
      ],
      messages: [{ role: "user", content: userPrompt }],
    });

    const texto = message.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();

    // Extraer el JSON aunque venga con texto alrededor.
    const inicio = texto.indexOf("{");
    const fin = texto.lastIndexOf("}");
    if (inicio === -1 || fin === -1) {
      return NextResponse.json(
        { ok: false, error: "La IA no devolvió un menú válido. Inténtalo de nuevo." },
        { status: 502 }
      );
    }
    const parsed = JSON.parse(texto.slice(inicio, fin + 1)) as {
      tomas?: { id?: string; menu?: unknown }[];
    };

    const resultado = (parsed.tomas ?? [])
      .filter((t) => typeof t.id === "string")
      .map((t) => ({
        id: t.id as string,
        menu: Array.isArray(t.menu)
          ? t.menu.map((l) => String(l)).filter((l) => l.trim() !== "")
          : [],
      }));

    return NextResponse.json({ ok: true, tomas: resultado });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Error desconocido." },
      { status: 502 }
    );
  }
}
