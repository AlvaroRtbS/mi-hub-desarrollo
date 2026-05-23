// ============================================================================
// Endpoint: POST /api/import/trainerstudio
// ----------------------------------------------------------------------------
// Importa datos desde Trainer Studio. Dos modos:
//
//  A) Modo "JSON pegado" (sin claves):
//     Body: { type: "clientas" | "programas" | "formularios", data: [...] }
//     El cliente envía un array con los registros ya parseados al esquema
//     documentado abajo.
//
//  B) Modo "Llamada directa a la API de TS" (requiere clave):
//     Body: { type: "clientas" | "programas" | "formularios", endpoint?: string }
//     Lee TS_API_KEY y TS_BASE de las env vars, llama a TS y traduce.
//     ⚠ Sin saber los endpoints exactos de TS, este modo es un STUB:
//     devuelve 501 hasta que el coach pegue la documentación o un ejemplo
//     de respuesta de TS y se implemente el mapeo concreto.
//
// Esquemas esperados (modo A):
//
// clientas:
//   { nombre, apellidos?, email, telefono?, fecha_nacimiento? (YYYY-MM-DD),
//     notas?, trainerstudio_id? }
//
// programas:
//   { nombre, descripcion?, num_semanas, trainerstudio_id?,
//     semanas: [{ semana_num, dias: [{ dia_num (1..7), titulo, descanso?,
//                  bloques: [{ titulo, indicaciones?,
//                             elementos: [{tipo: "ejercicio"|"contenido"|...,
//                                          ...campos del tipo}] }] }] }] }
//
// formularios:
//   { nombre, descripcion?,
//     preguntas: [{ id, tipo: "texto"|"numero"|"opcion_unica"|"opcion_multiple"|"escala",
//                   texto, opciones?: string[], requerido?: bool }] }
// ============================================================================

import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { EstructuraPrograma, Bloque, Elemento, Dia } from "@/lib/supabase/tipos";
import { NOMBRES_DIAS } from "@/lib/supabase/tipos";

type ResultadoImport = {
  insertados: number;
  saltados: number;
  errores: string[];
};

async function obtenerCoachId(): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("coaches")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  return data?.id ?? null;
}

// ---------------------------------------------------------------------------
// Importadores
// ---------------------------------------------------------------------------

type ClientaImport = {
  nombre: string;
  apellidos?: string;
  email: string;
  telefono?: string;
  fecha_nacimiento?: string;
  notas?: string;
  trainerstudio_id?: string;
};

async function importarClientas(
  coachId: string,
  data: ClientaImport[]
): Promise<ResultadoImport> {
  const supabase = await createSupabaseServerClient();
  const res: ResultadoImport = { insertados: 0, saltados: 0, errores: [] };

  for (const c of data) {
    if (!c.nombre || !c.email) {
      res.errores.push(`Sin nombre o email: ${JSON.stringify(c).slice(0, 80)}`);
      continue;
    }

    // Si trainerstudio_id ya existe → saltar (idempotente)
    if (c.trainerstudio_id) {
      const { data: existe } = await supabase
        .from("clientas")
        .select("id")
        .eq("trainerstudio_id", c.trainerstudio_id)
        .maybeSingle();
      if (existe) {
        res.saltados += 1;
        continue;
      }
    }

    const { error } = await supabase.from("clientas").insert({
      coach_id: coachId,
      nombre: c.nombre.trim(),
      apellidos: c.apellidos?.trim() || null,
      email: c.email.trim().toLowerCase(),
      telefono: c.telefono?.trim() || null,
      fecha_nacimiento: c.fecha_nacimiento || null,
      notas_publicas: c.notas?.trim() || null,
      trainerstudio_id: c.trainerstudio_id ?? null,
      estado: "activa",
    });

    if (error) {
      if (error.code === "23505") {
        res.saltados += 1;
      } else {
        res.errores.push(`${c.email}: ${error.message}`);
      }
    } else {
      res.insertados += 1;
    }
  }

  return res;
}

type ElementoImport =
  | {
      tipo: "ejercicio";
      ejercicio_nombre: string;
      series?: Array<{ reps: string; peso: string; rir?: string; descanso?: string }>;
    }
  | { tipo: "contenido"; titulo: string; markdown: string }
  | { tipo: "metrica_prompt"; metrica_tipo: string }
  | { tipo: "foto_progreso_prompt" }
  | { tipo: "pasos_prompt" }
  | { tipo: "recordatorio"; hora: string; mensaje: string };

type ProgramaImport = {
  nombre: string;
  descripcion?: string;
  num_semanas: number;
  trainerstudio_id?: string;
  semanas: Array<{
    semana_num: number;
    titulo?: string;
    dias: Array<{
      dia_num: number;
      titulo: string;
      descanso?: boolean;
      bloques: Array<{
        titulo: string;
        indicaciones?: string;
        elementos: ElementoImport[];
      }>;
    }>;
  }>;
};

async function importarProgramas(
  coachId: string,
  data: ProgramaImport[]
): Promise<ResultadoImport> {
  const supabase = await createSupabaseServerClient();
  const res: ResultadoImport = { insertados: 0, saltados: 0, errores: [] };

  const { data: bibliotecaData } = await supabase
    .from("ejercicios")
    .select("id, nombre")
    .order("nombre");
  const biblioteca = (bibliotecaData ?? []) as Array<{ id: string; nombre: string }>;
  const normaliza = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  const matchEjercicio = (nombre: string) => {
    const n = normaliza(nombre);
    return (
      biblioteca.find((e) => normaliza(e.nombre) === n) ??
      biblioteca.find((e) => normaliza(e.nombre).includes(n) || n.includes(normaliza(e.nombre)))
    );
  };

  for (const p of data) {
    if (!p.nombre || !p.semanas?.length) {
      res.errores.push(`Programa inválido: ${p.nombre ?? "(sin nombre)"}`);
      continue;
    }

    if (p.trainerstudio_id) {
      const { data: existe } = await supabase
        .from("programas")
        .select("id")
        .eq("trainerstudio_id", p.trainerstudio_id)
        .maybeSingle();
      if (existe) {
        res.saltados += 1;
        continue;
      }
    }

    const estructura: EstructuraPrograma = p.semanas.map((sem) => ({
      semana: sem.semana_num,
      titulo: sem.titulo,
      dias: Array.from({ length: 7 }, (_, j) => {
        const diaNum = j + 1;
        const dIn = sem.dias.find((d) => d.dia_num === diaNum);
        if (!dIn || dIn.descanso) {
          return {
            dia: diaNum,
            titulo: dIn?.titulo ?? NOMBRES_DIAS[j],
            descanso: true,
            bloques: [],
          } satisfies Dia;
        }
        const bloques: Bloque[] = (dIn.bloques ?? []).map((b) => ({
          id: crypto.randomUUID(),
          titulo: b.titulo,
          indicaciones: b.indicaciones,
          elementos: (b.elementos ?? [])
            .map((el): Elemento | null => {
              if (el.tipo === "ejercicio") {
                const match = matchEjercicio(el.ejercicio_nombre);
                if (match) {
                  return {
                    id: crypto.randomUUID(),
                    tipo: "ejercicio",
                    ejercicio_id: match.id,
                    ejercicio_nombre: match.nombre,
                    series: (el.series ?? [{ reps: "10", peso: "" }]).map((s) => ({
                      reps: s.reps,
                      peso: s.peso,
                      rir: s.rir,
                      descanso: s.descanso,
                    })),
                  };
                }
                return {
                  id: crypto.randomUUID(),
                  tipo: "contenido",
                  titulo: `⚠ Sin enlazar: ${el.ejercicio_nombre}`,
                  markdown: `Ejercicio importado: **${el.ejercicio_nombre}**\n\n_Crea este ejercicio en tu biblioteca o sustitúyelo._`,
                };
              }
              if (el.tipo === "contenido")
                return { id: crypto.randomUUID(), ...el } as Elemento;
              if (el.tipo === "metrica_prompt")
                return { id: crypto.randomUUID(), ...el } as Elemento;
              if (el.tipo === "foto_progreso_prompt")
                return { id: crypto.randomUUID(), tipo: "foto_progreso_prompt" };
              if (el.tipo === "pasos_prompt")
                return { id: crypto.randomUUID(), tipo: "pasos_prompt" };
              if (el.tipo === "recordatorio")
                return { id: crypto.randomUUID(), ...el } as Elemento;
              return null;
            })
            .filter((x): x is Elemento => x !== null),
        }));
        return {
          dia: diaNum,
          titulo: dIn.titulo,
          descanso: false,
          bloques,
        } satisfies Dia;
      }),
    }));

    const { error } = await supabase.from("programas").insert({
      coach_id: coachId,
      nombre: p.nombre,
      descripcion: p.descripcion ?? null,
      num_semanas: estructura.length,
      estructura,
      trainerstudio_id: p.trainerstudio_id ?? null,
      origen: "trainerstudio",
      etiquetas: ["importado-ts"],
    });

    if (error) res.errores.push(`${p.nombre}: ${error.message}`);
    else res.insertados += 1;
  }

  return res;
}

type FormularioImport = {
  nombre: string;
  descripcion?: string;
  preguntas: Array<{
    id?: string;
    tipo: "texto" | "numero" | "opcion_unica" | "opcion_multiple" | "escala";
    texto: string;
    opciones?: string[];
    requerido?: boolean;
  }>;
};

async function importarFormularios(
  coachId: string,
  data: FormularioImport[]
): Promise<ResultadoImport> {
  const supabase = await createSupabaseServerClient();
  const res: ResultadoImport = { insertados: 0, saltados: 0, errores: [] };

  for (const f of data) {
    if (!f.nombre || !f.preguntas?.length) {
      res.errores.push(`Formulario inválido: ${f.nombre ?? "(sin nombre)"}`);
      continue;
    }

    const preguntas = f.preguntas.map((p) => ({
      id: p.id ?? crypto.randomUUID(),
      tipo: p.tipo,
      texto: p.texto,
      opciones: p.opciones ?? [],
      requerido: p.requerido ?? false,
    }));

    const { error } = await supabase.from("formularios").insert({
      coach_id: coachId,
      nombre: f.nombre,
      descripcion: f.descripcion ?? null,
      preguntas,
    });

    if (error) res.errores.push(`${f.nombre}: ${error.message}`);
    else res.insertados += 1;
  }

  return res;
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  const coachId = await obtenerCoachId();
  if (!coachId) {
    return NextResponse.json({ ok: false, error: "No autenticada." }, { status: 401 });
  }

  let body: {
    type?: "clientas" | "programas" | "formularios";
    data?: unknown[];
    endpoint?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido." }, { status: 400 });
  }

  const tipo = body.type;
  if (tipo !== "clientas" && tipo !== "programas" && tipo !== "formularios") {
    return NextResponse.json(
      {
        ok: false,
        error: "type debe ser 'clientas', 'programas' o 'formularios'.",
      },
      { status: 400 }
    );
  }

  // Modo B (API directa) — stub hasta que se documenten los endpoints reales
  if (!body.data && process.env.TS_API_KEY) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Modo 'API directa' aún no implementado. Necesitamos la documentación o un ejemplo de respuesta de la API de Trainer Studio. Por ahora usa el modo A: pasa { type, data: [...] } con los registros parseados.",
      },
      { status: 501 }
    );
  }

  if (!Array.isArray(body.data)) {
    return NextResponse.json(
      { ok: false, error: "Falta el array 'data' con los registros a importar." },
      { status: 400 }
    );
  }

  try {
    let resultado: ResultadoImport;
    if (tipo === "clientas") {
      resultado = await importarClientas(coachId, body.data as ClientaImport[]);
    } else if (tipo === "programas") {
      resultado = await importarProgramas(coachId, body.data as ProgramaImport[]);
    } else {
      resultado = await importarFormularios(coachId, body.data as FormularioImport[]);
    }
    return NextResponse.json({ ok: true, ...resultado });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Error desconocido." },
      { status: 500 }
    );
  }
}
