// ============================================================================
// POST /api/seed/demo
// ----------------------------------------------------------------------------
// Crea (idempotentemente) datos de demo en la cuenta de la coach:
// - 3 clientas activas con datos realistas
// - Una biblioteca mínima de 8 ejercicios
// - 1 programa "Plan tonificación 4 semanas" asignado a cada clienta
// - Métricas de las últimas 4 semanas
// - Sesiones completadas (adherencia variada por clienta para que la racha
//   se vea bonita)
// - 1 conversación de chat por clienta
//
// DELETE para borrar todos los datos demo (los identifica por la etiqueta
// 'demo' en notas_publicas y por trainerstudio_id="demo:...").
// ============================================================================

import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  crearEstructuraVacia,
  type EstructuraPrograma,
  type Bloque,
  type ElementoEjercicio,
} from "@/lib/supabase/tipos";

const DEMO_TAG = "demo:mi-hub";

type Clienta = { nombre: string; apellidos: string; email: string; estado: "activa" };

const CLIENTAS: Array<{
  nombre: string;
  apellidos: string;
  email: string;
  edad: number;
  notas: string;
  adherencia: number; // 0..1 — porcentaje de sesiones completadas
}> = [
  {
    nombre: "María",
    apellidos: "García",
    email: "maria.demo@mi-hub.test",
    edad: 34,
    notas: "Objetivo: tonificación y pérdida de grasa. Entrena en casa con mancuernas hasta 8 kg. Sin lesiones.",
    adherencia: 0.9,
  },
  {
    nombre: "Sara",
    apellidos: "Pérez",
    email: "sara.demo@mi-hub.test",
    edad: 28,
    notas: "Objetivo: glúteo y postura. Entrena en gimnasio 4 días/semana. Antecedente de molestia lumbar — evitar peso muerto cargado.",
    adherencia: 0.6,
  },
  {
    nombre: "Laura",
    apellidos: "Martín",
    email: "laura.demo@mi-hub.test",
    edad: 41,
    notas: "Vuelve después del verano. Objetivo: retomar rutina y mejorar resistencia. Material en casa: banda elástica y esterilla.",
    adherencia: 0.3,
  },
];

const EJERCICIOS = [
  { nombre: "Sentadilla goblet", grupos: ["Pierna", "Glúteo"], material: ["Mancuernas"] },
  { nombre: "Hip thrust con mancuerna", grupos: ["Glúteo"], material: ["Mancuernas"] },
  { nombre: "Peso muerto rumano con mancuernas", grupos: ["Glúteo", "Pierna"], material: ["Mancuernas"] },
  { nombre: "Press hombro de pie con mancuernas", grupos: ["Hombros", "Brazos"], material: ["Mancuernas"] },
  { nombre: "Remo con mancuerna a una mano", grupos: ["Espalda", "Brazos"], material: ["Mancuernas"] },
  { nombre: "Plancha frontal", grupos: ["Core"], material: ["Esterilla"] },
  { nombre: "Zancada con mancuernas", grupos: ["Pierna", "Glúteo"], material: ["Mancuernas"] },
  { nombre: "Activación glúteo con banda", grupos: ["Glúteo"], material: ["Banda elástica"] },
];

function uuid() {
  return crypto.randomUUID();
}

function fechaISO(d: Date) {
  return d.toISOString().slice(0, 10);
}

function diasAtras(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return fechaISO(d);
}

function diasAdelante(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return fechaISO(d);
}

function bloquePrincipal(
  titulo: string,
  ejercicios: Array<{ id: string; nombre: string; reps: string; series: number }>
): Bloque {
  return {
    id: uuid(),
    titulo,
    indicaciones: "Descanso 60-90s entre series.",
    elementos: ejercicios.map(
      (e): ElementoEjercicio => ({
        id: uuid(),
        tipo: "ejercicio",
        ejercicio_id: e.id,
        ejercicio_nombre: e.nombre,
        series: Array.from({ length: e.series }, () => ({
          reps: e.reps,
          peso: "",
        })),
      })
    ),
  };
}

export async function POST() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "No autenticada." }, { status: 401 });
  }

  const { data: coach } = await supabase
    .from("coaches")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!coach) {
    return NextResponse.json({ ok: false, error: "Coach no encontrada." }, { status: 404 });
  }
  const coachId = coach.id;

  // ---- 1. EJERCICIOS ----
  const ejerciciosInsertados: Array<{ id: string; nombre: string }> = [];
  for (const e of EJERCICIOS) {
    // Idempotente: si ya existe ejercicio con ese nombre y origen 'demo', salta
    const { data: existe } = await supabase
      .from("ejercicios")
      .select("id, nombre")
      .eq("coach_id", coachId)
      .eq("nombre", e.nombre)
      .maybeSingle();

    if (existe) {
      ejerciciosInsertados.push(existe);
      continue;
    }

    const { data: nuevo, error } = await supabase
      .from("ejercicios")
      .insert({
        coach_id: coachId,
        nombre: e.nombre,
        grupos_musculares: e.grupos,
        material: e.material,
        descripcion: "Ejercicio de demo creado automáticamente.",
        trainerstudio_id: DEMO_TAG,
      })
      .select("id, nombre")
      .single();

    if (!error && nuevo) ejerciciosInsertados.push(nuevo);
  }

  // ---- 2. PROGRAMA ----
  const ejerByName = new Map(ejerciciosInsertados.map((e) => [e.nombre, e]));
  const estructura: EstructuraPrograma = crearEstructuraVacia(4);

  // Semana 1-4: Lun = Tren inferior + glúteo, Mié = Tren superior, Vie = Full body
  for (let sIdx = 0; sIdx < 4; sIdx++) {
    const sem = estructura[sIdx]!;
    const repsBase = sIdx < 2 ? "10-12" : "8-10";
    const seriesBase = sIdx < 2 ? 3 : 4;

    // Lunes
    sem.dias[0]!.titulo = "Tren inferior y glúteo";
    sem.dias[0]!.descanso = false;
    sem.dias[0]!.bloques = [
      {
        id: uuid(),
        titulo: "Calentamiento",
        indicaciones: "10 min movilidad cadera + activación glúteo con banda",
        elementos: [
          {
            id: uuid(),
            tipo: "ejercicio",
            ejercicio_id: ejerByName.get("Activación glúteo con banda")!.id,
            ejercicio_nombre: "Activación glúteo con banda",
            series: [{ reps: "15", peso: "", descanso: "30s" }],
          },
        ],
      },
      bloquePrincipal("Principal", [
        { ...ejerByName.get("Sentadilla goblet")!, reps: repsBase, series: seriesBase },
        { ...ejerByName.get("Hip thrust con mancuerna")!, reps: repsBase, series: seriesBase },
        { ...ejerByName.get("Peso muerto rumano con mancuernas")!, reps: repsBase, series: seriesBase },
        { ...ejerByName.get("Zancada con mancuernas")!, reps: "10 por pierna", series: 3 },
      ]),
    ];

    // Miércoles
    sem.dias[2]!.titulo = "Tren superior";
    sem.dias[2]!.descanso = false;
    sem.dias[2]!.bloques = [
      bloquePrincipal("Principal", [
        { ...ejerByName.get("Press hombro de pie con mancuernas")!, reps: repsBase, series: seriesBase },
        { ...ejerByName.get("Remo con mancuerna a una mano")!, reps: repsBase, series: seriesBase },
        { ...ejerByName.get("Plancha frontal")!, reps: "30s", series: 3 },
      ]),
    ];

    // Viernes
    sem.dias[4]!.titulo = "Full body";
    sem.dias[4]!.descanso = false;
    sem.dias[4]!.bloques = [
      bloquePrincipal("Circuito (3 vueltas)", [
        { ...ejerByName.get("Sentadilla goblet")!, reps: "12", series: 3 },
        { ...ejerByName.get("Remo con mancuerna a una mano")!, reps: "12", series: 3 },
        { ...ejerByName.get("Plancha frontal")!, reps: "30s", series: 3 },
      ]),
    ];
  }

  // Idempotente: si ya existe el programa demo, lo reutilizamos
  let programaId: string;
  const { data: progExiste } = await supabase
    .from("programas")
    .select("id")
    .eq("coach_id", coachId)
    .eq("trainerstudio_id", DEMO_TAG)
    .maybeSingle();

  if (progExiste) {
    programaId = progExiste.id;
  } else {
    const { data: progNuevo, error } = await supabase
      .from("programas")
      .insert({
        coach_id: coachId,
        nombre: "Plan tonificación 4 semanas (demo)",
        descripcion: "Programa de demostración. 3 días/semana, énfasis tren inferior.",
        num_semanas: 4,
        estructura,
        origen: "plantilla",
        etiquetas: ["demo"],
        trainerstudio_id: DEMO_TAG,
      })
      .select("id")
      .single();
    if (error || !progNuevo) {
      return NextResponse.json({ ok: false, error: error?.message ?? "No se pudo crear el programa demo" }, { status: 500 });
    }
    programaId = progNuevo.id;
  }

  // ---- 3. CLIENTAS + datos asociados ----
  const fechaInicioPrograma = diasAtras(21); // hace 3 semanas
  const fechaFinPrograma = diasAdelante(7);

  for (const c of CLIENTAS) {
    // Idempotente
    const { data: existe } = await supabase
      .from("clientas")
      .select("id")
      .eq("coach_id", coachId)
      .eq("email", c.email)
      .maybeSingle();

    let clientaId: string;
    if (existe) {
      clientaId = existe.id;
    } else {
      const fechaNacimiento = new Date();
      fechaNacimiento.setFullYear(fechaNacimiento.getFullYear() - c.edad);

      const { data: nueva, error } = await supabase
        .from("clientas")
        .insert({
          coach_id: coachId,
          nombre: c.nombre,
          apellidos: c.apellidos,
          email: c.email,
          fecha_nacimiento: fechaISO(fechaNacimiento),
          notas_publicas: c.notas,
          estado: "activa",
          trainerstudio_id: DEMO_TAG,
        })
        .select("id")
        .single();
      if (error || !nueva) continue;
      clientaId = nueva.id;
    }

    // Asignación
    const { data: asigExiste } = await supabase
      .from("asignaciones")
      .select("id")
      .eq("clienta_id", clientaId)
      .eq("programa_id", programaId)
      .maybeSingle();

    if (!asigExiste) {
      await supabase.from("asignaciones").insert({
        coach_id: coachId,
        clienta_id: clientaId,
        programa_id: programaId,
        fecha_inicio: fechaInicioPrograma,
        fecha_fin: fechaFinPrograma,
        estructura_snapshot: estructura,
        activa: true,
      });
    }

    // Sesiones: para cada día de entreno desde fechaInicio hasta hoy,
    // crear una sesión con completada=true con probabilidad `adherencia`
    const desde = new Date(fechaInicioPrograma + "T00:00:00Z");
    const hoy = new Date(fechaISO(new Date()) + "T00:00:00Z");
    const diasEntreno = [0, 2, 4]; // L, M, V (0-indexed desde lunes)

    for (let d = new Date(desde); d <= hoy; d.setDate(d.getDate() + 1)) {
      const diaSemana = (d.getDay() + 6) % 7; // domingo=6, lunes=0
      if (!diasEntreno.includes(diaSemana)) continue;

      const fecha = fechaISO(d);
      const { data: sesExiste } = await supabase
        .from("sesiones")
        .select("id")
        .eq("clienta_id", clientaId)
        .eq("fecha", fecha)
        .maybeSingle();
      if (sesExiste) continue;

      // Determinista pero "aleatorio": hash de fecha+clienta
      const seed = (fecha + c.email).split("").reduce((a, b) => a + b.charCodeAt(0), 0);
      const completada = (seed % 100) / 100 < c.adherencia;

      await supabase.from("sesiones").insert({
        coach_id: coachId,
        clienta_id: clientaId,
        fecha,
        completada,
        porcentaje_completado: completada ? 100 : 0,
      });
    }

    // Métricas: 4 puntos de peso (1 por semana) + 2 de cintura
    const pesoBase = c.nombre === "María" ? 68 : c.nombre === "Sara" ? 62 : 74;
    for (let semana = 0; semana < 4; semana++) {
      const fechaMed = diasAtras(28 - semana * 7);
      const variacion = -semana * 0.4 + (semana % 2 === 0 ? 0.2 : -0.2);
      const { data: existeMet } = await supabase
        .from("metricas")
        .select("id")
        .eq("clienta_id", clientaId)
        .eq("tipo", "peso")
        .eq("fecha", fechaMed)
        .maybeSingle();
      if (!existeMet) {
        await supabase.from("metricas").insert({
          coach_id: coachId,
          clienta_id: clientaId,
          tipo: "peso",
          valor: Number((pesoBase + variacion).toFixed(1)),
          unidad: "kg",
          fecha: fechaMed,
        });
      }
    }
    for (let semana = 0; semana < 2; semana++) {
      const fechaMed = diasAtras(28 - semana * 14);
      const cinturaBase = c.nombre === "María" ? 76 : c.nombre === "Sara" ? 70 : 84;
      const { data: existeMet } = await supabase
        .from("metricas")
        .select("id")
        .eq("clienta_id", clientaId)
        .eq("tipo", "perimetro_cintura")
        .eq("fecha", fechaMed)
        .maybeSingle();
      if (!existeMet) {
        await supabase.from("metricas").insert({
          coach_id: coachId,
          clienta_id: clientaId,
          tipo: "perimetro_cintura",
          valor: cinturaBase - semana * 0.8,
          unidad: "cm",
          fecha: fechaMed,
        });
      }
    }

    // Mensajes: 1 conversación corta
    const { count: msgCount } = await supabase
      .from("mensajes")
      .select("id", { count: "exact", head: true })
      .eq("clienta_id", clientaId);

    if ((msgCount ?? 0) === 0) {
      await supabase.from("mensajes").insert([
        {
          coach_id: coachId,
          clienta_id: clientaId,
          remitente: "coach",
          contenido: `¡Hola ${c.nombre}! ¿Cómo va la semana?`,
          leido: true,
          enviado_en: diasAtras(2) + "T10:00:00Z",
        },
        {
          coach_id: coachId,
          clienta_id: clientaId,
          remitente: "clienta",
          contenido:
            c.nombre === "María"
              ? "¡Genial! He completado los 3 entrenos. El hip thrust me está costando, ¿algún truco?"
              : c.nombre === "Sara"
              ? "Me ha costado esta semana, mucho trabajo. Solo he podido el lunes."
              : "Hola! Esta semana no he podido entrenar nada, lo siento. La próxima retomo.",
          leido: false,
          enviado_en: diasAtras(1) + "T18:30:00Z",
        },
      ]);
    }
  }

  return NextResponse.json({
    ok: true,
    mensaje: "Datos demo creados (idempotente).",
    detalle: {
      ejercicios: ejerciciosInsertados.length,
      clientas: CLIENTAS.length,
      programa: "Plan tonificación 4 semanas (demo)",
    },
  });
}

export async function DELETE() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "No autenticada." }, { status: 401 });
  }

  // Borra todo lo etiquetado como demo
  // Las cascadas del schema borran asignaciones, sesiones, métricas, mensajes
  await supabase.from("clientas").delete().eq("trainerstudio_id", DEMO_TAG);
  await supabase.from("programas").delete().eq("trainerstudio_id", DEMO_TAG);
  await supabase.from("ejercicios").delete().eq("trainerstudio_id", DEMO_TAG);

  return NextResponse.json({ ok: true, mensaje: "Datos demo borrados." });
}
