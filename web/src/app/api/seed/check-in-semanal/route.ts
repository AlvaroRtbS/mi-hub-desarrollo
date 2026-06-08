// ============================================================================
// POST /api/seed/check-in-semanal
// ----------------------------------------------------------------------------
// Crea (idempotentemente) el formulario "Check-in semanal" en la cuenta de la
// coach. Es la plantilla base de la encuesta que las clientas rellenan cada
// domingo / lunes.
//
// Equivalente al "Cuestionario semanal" de Trainer Studio.
// ============================================================================

import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Endpoint de desarrollo: deshabilitado en producción salvo ALLOW_SEED=true.
function seedBloqueado(): NextResponse | null {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_SEED !== "true") {
    return NextResponse.json(
      { ok: false, error: "Endpoint de desarrollo deshabilitado en producción." },
      { status: 403 }
    );
  }
  return null;
}

export async function POST() {
  const bloqueado = seedBloqueado();
  if (bloqueado) return bloqueado;

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

  const NOMBRE = "Check-in semanal";

  // Idempotente: no duplicar si ya existe uno con este nombre
  const { data: existente } = await supabase
    .from("formularios")
    .select("id")
    .eq("nombre", NOMBRE)
    .maybeSingle();

  if (existente) {
    return NextResponse.json({ ok: true, id: existente.id, creado: false });
  }

  const preguntas = [
    {
      id: crypto.randomUUID(),
      tipo: "escala",
      texto: "¿Cómo ha ido la semana de entreno? (1 = mal, 10 = perfecta)",
      opciones: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
      requerido: true,
    },
    {
      id: crypto.randomUUID(),
      tipo: "escala",
      texto: "Nivel de energía estos días (1-10)",
      opciones: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
      requerido: true,
    },
    {
      id: crypto.randomUUID(),
      tipo: "escala",
      texto: "Calidad del descanso / sueño (1-10)",
      opciones: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
      requerido: true,
    },
    {
      id: crypto.randomUUID(),
      tipo: "escala",
      texto: "Motivación con el plan (1-10)",
      opciones: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
      requerido: true,
    },
    {
      id: crypto.randomUUID(),
      tipo: "opcion_unica",
      texto: "¿Has tenido alguna molestia o dolor durante los entrenos?",
      opciones: ["No", "Sí, ligero", "Sí, moderado", "Sí, importante"],
      requerido: true,
    },
    {
      id: crypto.randomUUID(),
      tipo: "texto",
      texto: "Si has tenido alguna molestia, ¿dónde y en qué ejercicio?",
      requerido: false,
    },
    {
      id: crypto.randomUUID(),
      tipo: "opcion_unica",
      texto: "Adherencia: ¿cuántos entrenos has completado de los planificados?",
      opciones: ["Todos", "Falta 1", "Faltan 2", "Faltan 3 o más", "Ninguno"],
      requerido: true,
    },
    {
      id: crypto.randomUUID(),
      tipo: "texto",
      texto: "Cuéntame algo que haya ido especialmente bien esta semana",
      requerido: false,
    },
    {
      id: crypto.randomUUID(),
      tipo: "texto",
      texto: "¿Algo que cambiar / probar la semana que viene?",
      requerido: false,
    },
  ];

  const { data, error } = await supabase
    .from("formularios")
    .insert({
      coach_id: coach.id,
      nombre: NOMBRE,
      descripcion:
        "Encuesta semanal estándar: energía, sueño, motivación, dolores y adherencia. Envíaselo cada domingo a las clientas activas.",
      preguntas,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: data.id, creado: true });
}
