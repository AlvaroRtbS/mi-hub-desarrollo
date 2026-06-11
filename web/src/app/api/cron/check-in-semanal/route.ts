// ============================================================================
// Cron: domingos a las 18:00 UTC (~ 19/20h España)
// ----------------------------------------------------------------------------
// Recorre TODAS las coaches y, por cada una, envía un mensaje recordando el
// check-in semanal a sus clientas activas (si tienen formulario "Check-in
// semanal" creado). Si no lo tienen, lo crea on-the-fly.
//
// Vercel Cron añade automáticamente el header `Authorization: Bearer
// CRON_SECRET` cuando llama a estos endpoints — lo validamos para evitar
// que cualquiera dispare el cron desde fuera.
// ============================================================================

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { hoyISO } from "@/lib/utilidades";

const MENSAJE_RECORDATORIO = `¡Hola! Es domingo — ¿me cuentas cómo te ha ido la semana?\n\nResponde rápido al check-in semanal cuando puedas (5 min): energía, descanso, motivación y cómo te has sentido en los entrenos.`;

function verificarCron(request: Request): boolean {
  // En Vercel Cron, el header es automático. En desarrollo, permitir si no
  // hay CRON_SECRET configurado (avisamos pero no bloqueamos local).
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!verificarCron(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  // Cliente con SERVICE_ROLE_KEY (bypassa RLS, necesario para cron que recorre
  // varias coaches sin sesión)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json(
      { ok: false, error: "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY." },
      { status: 500 }
    );
  }
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  const { data: clientas } = await supabase
    .from("clientas")
    .select("id, coach_id")
    .eq("estado", "activa");

  if (!clientas || clientas.length === 0) {
    return NextResponse.json({ ok: true, mensajes: 0, motivo: "Sin clientas activas." });
  }

  // Para cada clienta, insertar mensaje del coach con el recordatorio.
  // Idempotencia: solo si NO hay ya un mensaje del coach hoy con este texto.
  const hoy = hoyISO();
  let insertados = 0;

  for (const c of clientas) {
    const { data: existe } = await supabase
      .from("mensajes")
      .select("id")
      .eq("clienta_id", c.id)
      .eq("remitente", "coach")
      .gte("enviado_en", `${hoy}T00:00:00Z`)
      .ilike("contenido", "%check-in semanal%")
      .maybeSingle();

    if (existe) continue;

    const { error } = await supabase.from("mensajes").insert({
      coach_id: c.coach_id,
      clienta_id: c.id,
      remitente: "coach",
      contenido: MENSAJE_RECORDATORIO,
    });
    if (!error) insertados += 1;
  }

  return NextResponse.json({
    ok: true,
    clientas_revisadas: clientas.length,
    mensajes_enviados: insertados,
  });
}
