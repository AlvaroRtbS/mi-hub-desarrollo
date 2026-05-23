// ============================================================================
// Endpoint: POST /api/ia/generar-programa
// ----------------------------------------------------------------------------
// Genera un programa de entrenamiento completo usando Claude (Opus 4.7).
// Toma la ficha de la clienta + instrucciones libres del coach y devuelve
// un programa con semanas/días/bloques/ejercicios listo para guardar.
//
// Variables de entorno requeridas (poner en Vercel cuando se active):
//   ANTHROPIC_API_KEY   - clave de https://console.anthropic.com
//
// Body:
//   { clientaId: string, instrucciones: string, numSemanas?: number,
//     diasPorSemana?: number, nombrePropuesto?: string }
//
// Respuesta éxito: { ok: true, programaId: string }
// Respuesta error: { ok: false, error: string }
// ============================================================================

import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  EstructuraPrograma,
  Bloque,
  Elemento,
  ElementoEjercicio,
  Dia,
} from "@/lib/supabase/tipos";
import { NOMBRES_DIAS } from "@/lib/supabase/tipos";

// ----------------------------------------------------------------------------
// System prompt: grande, estable, cacheable (≥ 4096 tokens en Opus 4.7).
// Se cachea con cache_control. Solo cambia el bloque "user" entre llamadas.
// ----------------------------------------------------------------------------

const SYSTEM_PROMPT = `Eres un asistente experto en planificación de entrenamientos para una entrenadora personal de mujeres. Tu trabajo es proponer un programa de entrenamiento estructurado a partir de la información que te da la entrenadora sobre una clienta concreta y sus objetivos.

# Contexto
Trabajas dentro de una plataforma propia (similar a Trainer Studio) que la entrenadora usa para gestionar a sus clientas. La entrenadora supervisará todo lo que generes y podrá editar el programa antes de asignarlo. Tu propuesta debe ser conservadora, segura y editable — nunca recetes pautas extremas sin matizar.

# Estructura que debes devolver
Devuelves un programa con esta jerarquía:
- Programa: nombre, descripción, número de semanas
- Cada semana tiene 7 días (Lunes a Domingo, en ese orden)
- Cada día es de entreno o de descanso (descanso = true). Los días de entreno tienen bloques.
- Cada bloque tiene un título (Calentamiento / Principal / Cooldown / Cardio / etc.), unas indicaciones (opcional) y una lista de elementos.
- Cada elemento es UNO de los siguientes tipos:

  1) "ejercicio" — un ejercicio físico con series.
     Campos: ejercicio_nombre (string), series (array). Cada serie: { reps (string), peso (string, vacío si peso libre), rir (string opcional), descanso (string opcional, ej "60s") }.
     Ejemplos de nombre: "Sentadilla goblet con mancuerna", "Hip thrust con barra", "Press banca", "Plancha frontal".
     IMPORTANTE: las "reps" pueden ser un número exacto ("10") o un rango ("8-12") o tiempo ("30s"). El "peso" puede quedarse vacío ("") si lo decide la clienta o si depende de su nivel.

  2) "contenido" — una nota o explicación para la clienta.
     Campos: titulo (string), markdown (string, hasta 1000 caracteres).
     Úsalo para introducciones de semana, recordatorios de técnica, motivación, advertencias de seguridad o ejercicios donde no hay series claras.

  3) "metrica_prompt" — pedir a la clienta que registre una métrica corporal.
     Campos: metrica_tipo (uno de: "peso", "perimetro_cintura", "perimetro_cadera", "perimetro_brazo", "porcentaje_grasa").
     Úsalo típicamente al inicio del programa (semana 1, lunes) y cada 2-4 semanas.

  4) "foto_progreso_prompt" — pedir foto de progreso.
     Sin campos extra. Úsalo al inicio (semana 1) y cada 4 semanas.

  5) "pasos_prompt" — pedir pasos del día.
     Sin campos extra. Lo puedes poner como recordatorio en algunos días.

# Principios de diseño (síguelos)
1. **Seguridad primero.** Si la clienta tiene una lesión, embarazo, rehabilitación o cualquier condición que la entrenadora mencione, adapta los ejercicios y márcalo en una nota de "contenido" al inicio.
2. **Progresión lineal sencilla.** A lo largo de las semanas, sube ligeramente reps, series o intensidad (no más de un cambio por semana).
3. **Estructura por día de entreno:**
   - Bloque 1: "Calentamiento" (5-10 minutos: movilidad, activación específica)
   - Bloque 2: "Principal" (ejercicios compuestos primero, luego accesorios)
   - Bloque 3 opcional: "Cardio" o "Cooldown" (estiramientos, respiración)
4. **Equilibrio.** Si la clienta entrena 3-4 días/semana, alterna empuje/tracción/pierna o usa full body. No metas dos días seguidos del mismo grupo muscular grande.
5. **Adapta al material.** Si la entrenadora dice "entrena en casa con bandas y mancuernas", NO propongas barra, jaula, ni máquinas.
6. **Adapta al deporte/contexto.** Si la clienta hace fútbol los miércoles, evita pierna pesada el martes y el jueves. Si trabaja muchas horas sentada, mete movilidad cadera/columna.
7. **Días de descanso.** Para un programa de 3 días/semana, descansa Mar/Jue/Sáb/Dom. Para 4 días: Mié/Sáb/Dom. Para 5 días: Mié/Dom. Adapta si la clienta tiene un día fijo libre.
8. **Nomenclatura de ejercicios.** Usa nombres claros y comunes en español. Si conoces el nombre técnico, úsalo: "Peso muerto rumano con mancuernas", "Remo invertido en TRX", "Sentadilla búlgara".
9. **Series y reps por defecto:**
   - Fuerza/hipertrofia: 3-4 series de 8-12 reps
   - Resistencia muscular: 2-3 series de 15-20 reps
   - Tonificación/principiantes: 3 series de 10-12 reps
   - Si es un ejercicio isométrico (plancha): series de tiempo (30s, 45s)
10. **Descanso entre series:** 60-90s para hipertrofia, 30-45s para tonificación/circuitos, 2-3 min para fuerza pesada.
11. **Bloques "Contenido" útiles:** Una nota al inicio del programa explicando el plan. Una nota a mitad de programa (semana central) con un check-in motivacional. Notas puntuales para recordar técnica delicada.
12. **No exageres las métricas.** Solo programa una métrica corporal cada 2 semanas como mucho. Las clientas se desmoralizan si les pides el peso cada día.

# Reglas estrictas
- NUNCA propongas un programa con más de 6 días de entreno por semana.
- NUNCA propongas más de 12 ejercicios en un solo día.
- NUNCA inventes el peso real de la clienta — usa "" o frases como "el que te permita completar bien la última repetición".
- NUNCA des consejos médicos o de nutrición. Si la entrenadora menciona algo que requiere un profesional (lesión grave, embarazo de riesgo, patología), añade una nota: "Consulta con tu fisioterapeuta/médico antes de empezar este programa".
- NUNCA uses emojis dentro del contenido, salvo si forman parte del flujo natural de un mensaje motivacional ocasional.

# Formato de salida
Debes devolver EXACTAMENTE un objeto JSON con esta forma:

{
  "nombre": "Nombre del programa propuesto",
  "descripcion": "Una o dos frases que resumen el plan y para quién es.",
  "num_semanas": <número>,
  "semanas": [
    {
      "semana_num": 1,
      "titulo": "Semana 1 — Adaptación" (opcional),
      "dias": [
        {
          "dia_num": 1,  // 1=Lunes, 2=Martes, ..., 7=Domingo
          "titulo": "Tren superior y core",
          "descanso": false,
          "bloques": [
            {
              "titulo": "Calentamiento",
              "indicaciones": "10 min de movilidad y activación.",
              "elementos": [
                {
                  "tipo": "ejercicio",
                  "ejercicio_nombre": "Movilidad hombros con banda",
                  "series": [{"reps": "10", "peso": "", "descanso": "30s"}]
                }
              ]
            }
          ]
        },
        {
          "dia_num": 2,
          "titulo": "Descanso",
          "descanso": true,
          "bloques": []
        }
      ]
    }
  ]
}

CADA semana debe tener LOS 7 días (dia_num del 1 al 7), incluidos los de descanso (con descanso=true y bloques=[]). No omitas ningún día.

Devuelves solo el JSON, sin texto explicativo ni markdown alrededor. La salida será parseada directamente.`;

// ----------------------------------------------------------------------------
// JSON schema de respuesta (structured outputs)
// ----------------------------------------------------------------------------

const SCHEMA_RESPUESTA = {
  type: "object",
  properties: {
    nombre: { type: "string" },
    descripcion: { type: "string" },
    num_semanas: { type: "integer" },
    semanas: {
      type: "array",
      items: {
        type: "object",
        properties: {
          semana_num: { type: "integer" },
          titulo: { type: "string" },
          dias: {
            type: "array",
            items: {
              type: "object",
              properties: {
                dia_num: { type: "integer" },
                titulo: { type: "string" },
                descanso: { type: "boolean" },
                bloques: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      titulo: { type: "string" },
                      indicaciones: { type: "string" },
                      elementos: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            tipo: {
                              type: "string",
                              enum: [
                                "ejercicio",
                                "contenido",
                                "metrica_prompt",
                                "foto_progreso_prompt",
                                "pasos_prompt",
                              ],
                            },
                            ejercicio_nombre: { type: "string" },
                            series: {
                              type: "array",
                              items: {
                                type: "object",
                                properties: {
                                  reps: { type: "string" },
                                  peso: { type: "string" },
                                  rir: { type: "string" },
                                  descanso: { type: "string" },
                                },
                                required: ["reps", "peso"],
                                additionalProperties: false,
                              },
                            },
                            titulo: { type: "string" },
                            markdown: { type: "string" },
                            metrica_tipo: { type: "string" },
                          },
                          required: ["tipo"],
                          additionalProperties: false,
                        },
                      },
                    },
                    required: ["titulo", "elementos"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["dia_num", "titulo", "descanso", "bloques"],
              additionalProperties: false,
            },
          },
        },
        required: ["semana_num", "dias"],
        additionalProperties: false,
      },
    },
  },
  required: ["nombre", "descripcion", "num_semanas", "semanas"],
  additionalProperties: false,
} as const;

// ----------------------------------------------------------------------------
// Tipos parseados de la respuesta de Claude
// ----------------------------------------------------------------------------

type SerieClaude = {
  reps: string;
  peso: string;
  rir?: string;
  descanso?: string;
};

type ElementoClaude = {
  tipo:
    | "ejercicio"
    | "contenido"
    | "metrica_prompt"
    | "foto_progreso_prompt"
    | "pasos_prompt";
  ejercicio_nombre?: string;
  series?: SerieClaude[];
  titulo?: string;
  markdown?: string;
  metrica_tipo?: string;
};

type BloqueClaude = {
  titulo: string;
  indicaciones?: string;
  elementos: ElementoClaude[];
};

type DiaClaude = {
  dia_num: number;
  titulo: string;
  descanso: boolean;
  bloques: BloqueClaude[];
};

type SemanaClaude = {
  semana_num: number;
  titulo?: string;
  dias: DiaClaude[];
};

type RespuestaClaude = {
  nombre: string;
  descripcion: string;
  num_semanas: number;
  semanas: SemanaClaude[];
};

// ----------------------------------------------------------------------------
// Mapeador: respuesta de Claude → EstructuraPrograma + matching ejercicios
// ----------------------------------------------------------------------------

function normaliza(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function buscarEjercicio(
  nombre: string,
  biblioteca: Array<{ id: string; nombre: string }>
): { id: string; nombre: string } | null {
  const objetivo = normaliza(nombre);
  if (!objetivo) return null;

  // Coincidencia exacta normalizada
  const exacto = biblioteca.find((e) => normaliza(e.nombre) === objetivo);
  if (exacto) return exacto;

  // Coincidencia por substring (cualquier dirección)
  const sub = biblioteca.find((e) => {
    const n = normaliza(e.nombre);
    return n.includes(objetivo) || objetivo.includes(n);
  });
  return sub ?? null;
}

function mapearRespuesta(
  resp: RespuestaClaude,
  biblioteca: Array<{ id: string; nombre: string }>
): EstructuraPrograma {
  return resp.semanas.map((sem) => ({
    semana: sem.semana_num,
    titulo: sem.titulo,
    dias: Array.from({ length: 7 }, (_, j) => {
      const diaNum = j + 1;
      const dClaude = sem.dias.find((d) => d.dia_num === diaNum);
      const titulo = dClaude?.titulo ?? NOMBRES_DIAS[j];
      if (!dClaude || dClaude.descanso) {
        return {
          dia: diaNum,
          titulo,
          descanso: true,
          bloques: [],
        } satisfies Dia;
      }
      const bloques: Bloque[] = dClaude.bloques.map((b) => ({
        id: crypto.randomUUID(),
        titulo: b.titulo,
        indicaciones: b.indicaciones,
        elementos: b.elementos
          .map((el): Elemento | null => {
            switch (el.tipo) {
              case "ejercicio": {
                if (!el.ejercicio_nombre) return null;
                const match = buscarEjercicio(el.ejercicio_nombre, biblioteca);
                if (match) {
                  return {
                    id: crypto.randomUUID(),
                    tipo: "ejercicio",
                    ejercicio_id: match.id,
                    ejercicio_nombre: match.nombre,
                    series: (el.series ?? [{ reps: "10", peso: "" }]).map(
                      (s) => ({
                        reps: s.reps,
                        peso: s.peso,
                        rir: s.rir,
                        descanso: s.descanso,
                      })
                    ),
                  } satisfies ElementoEjercicio;
                }
                // Sin match: lo convertimos en nota para que la coach lo enlace
                const seriesTexto = (el.series ?? [])
                  .map(
                    (s) =>
                      `${s.reps} reps${s.peso ? ` @ ${s.peso}` : ""}${
                        s.descanso ? ` (descanso ${s.descanso})` : ""
                      }`
                  )
                  .join(" · ");
                return {
                  id: crypto.randomUUID(),
                  tipo: "contenido",
                  titulo: `⚠ Sin enlazar: ${el.ejercicio_nombre}`,
                  markdown: `Ejercicio sugerido por IA: **${el.ejercicio_nombre}**\n\n${seriesTexto}\n\n_Crea este ejercicio en tu biblioteca o sustitúyelo por uno equivalente._`,
                };
              }
              case "contenido":
                return {
                  id: crypto.randomUUID(),
                  tipo: "contenido",
                  titulo: el.titulo ?? "Nota",
                  markdown: el.markdown ?? "",
                };
              case "metrica_prompt":
                return {
                  id: crypto.randomUUID(),
                  tipo: "metrica_prompt",
                  metrica_tipo: el.metrica_tipo ?? "peso",
                };
              case "foto_progreso_prompt":
                return {
                  id: crypto.randomUUID(),
                  tipo: "foto_progreso_prompt",
                };
              case "pasos_prompt":
                return { id: crypto.randomUUID(), tipo: "pasos_prompt" };
              default:
                return null;
            }
          })
          .filter((x): x is Elemento => x !== null),
      }));
      return {
        dia: diaNum,
        titulo,
        descanso: false,
        bloques,
      } satisfies Dia;
    }),
  }));
}

// ----------------------------------------------------------------------------
// Handler principal
// ----------------------------------------------------------------------------

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Falta la variable de entorno ANTHROPIC_API_KEY. Añádela en Vercel → Settings → Environment Variables y redespliega.",
      },
      { status: 500 }
    );
  }

  let body: { clientaId?: string; instrucciones?: string; nombrePropuesto?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "JSON inválido en el body." },
      { status: 400 }
    );
  }

  const clientaId = String(body.clientaId ?? "").trim();
  const instrucciones = String(body.instrucciones ?? "").trim();
  if (!clientaId) {
    return NextResponse.json(
      { ok: false, error: "Falta clientaId." },
      { status: 400 }
    );
  }
  if (!instrucciones) {
    return NextResponse.json(
      { ok: false, error: "Faltan las instrucciones para la IA." },
      { status: 400 }
    );
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: "No autenticada." },
      { status: 401 }
    );
  }

  const { data: coach } = await supabase
    .from("coaches")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!coach) {
    return NextResponse.json(
      { ok: false, error: "Coach no encontrada." },
      { status: 404 }
    );
  }

  const { data: clienta } = await supabase
    .from("clientas")
    .select(
      "id, nombre, apellidos, fecha_nacimiento, notas_publicas, estado"
    )
    .eq("id", clientaId)
    .maybeSingle();
  if (!clienta) {
    return NextResponse.json(
      { ok: false, error: "Clienta no encontrada." },
      { status: 404 }
    );
  }

  const { data: ejerciciosData } = await supabase
    .from("ejercicios")
    .select("id, nombre, grupos_musculares, material")
    .order("nombre");
  const biblioteca = (ejerciciosData ?? []) as Array<{
    id: string;
    nombre: string;
    grupos_musculares: string[];
    material: string[];
  }>;

  const edad = clienta.fecha_nacimiento
    ? Math.floor(
        (Date.now() - new Date(clienta.fecha_nacimiento).getTime()) /
          (365.25 * 24 * 3600 * 1000)
      )
    : null;

  // Top 50 ejercicios de la biblioteca para inspirar a Claude
  const listaEjercicios = biblioteca
    .slice(0, 50)
    .map(
      (e) =>
        `- ${e.nombre}${
          e.grupos_musculares?.length ? ` [${e.grupos_musculares.join(", ")}]` : ""
        }${e.material?.length ? ` (material: ${e.material.join(", ")})` : ""}`
    )
    .join("\n");

  const userPrompt = `# Ficha de la clienta
- Nombre: ${clienta.nombre} ${clienta.apellidos ?? ""}
${edad !== null ? `- Edad: ${edad} años\n` : ""}${
    clienta.notas_publicas
      ? `- Notas previas de la entrenadora:\n${clienta.notas_publicas}\n`
      : ""
  }
# Biblioteca de ejercicios existentes (úsalos cuando puedas — el matching es por nombre)
${listaEjercicios || "(la entrenadora aún no ha creado ejercicios en su biblioteca; usa nombres claros y se enlazarán a mano)"}

# Instrucciones de la entrenadora para este programa
${instrucciones}

Devuelve el programa en el formato JSON exacto que se ha definido en las instrucciones del sistema. Solo el JSON, sin texto adicional.`;

  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  let respuestaClaude: RespuestaClaude;
  try {
    const message = await anthropic.messages.create({
      model: "claude-opus-4-7",
      max_tokens: 16000,
      thinking: { type: "adaptive" },
      output_config: {
        format: { type: "json_schema", schema: SCHEMA_RESPUESTA },
      },
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [
        {
          role: "user",
          content: userPrompt,
        },
      ],
    });

    // Localiza el primer bloque de texto y parsea
    const textoSalida = message.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");

    respuestaClaude = JSON.parse(textoSalida) as RespuestaClaude;
  } catch (err) {
    const mensaje =
      err instanceof Anthropic.APIError
        ? `${err.status ?? ""} ${err.message}`.trim()
        : err instanceof Error
        ? err.message
        : "Error desconocido llamando a Claude.";
    return NextResponse.json(
      { ok: false, error: `Claude: ${mensaje}` },
      { status: 502 }
    );
  }

  const estructura = mapearRespuesta(respuestaClaude, biblioteca);
  const numSemanas = Math.max(1, estructura.length);
  const nombre =
    (body.nombrePropuesto?.trim() || respuestaClaude.nombre)?.slice(0, 200) ??
    "Programa generado por IA";

  const { data: insertado, error: errInsert } = await supabase
    .from("programas")
    .insert({
      coach_id: coach.id,
      nombre,
      descripcion: respuestaClaude.descripcion,
      num_semanas: numSemanas,
      estructura,
      origen: "ia",
      etiquetas: ["ia", `clienta:${clienta.nombre.toLowerCase()}`],
    })
    .select("id")
    .single();

  if (errInsert || !insertado) {
    return NextResponse.json(
      {
        ok: false,
        error: `Programa generado pero falló al guardar: ${
          errInsert?.message ?? "desconocido"
        }`,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, programaId: insertado.id });
}
