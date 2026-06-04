// ============================================================================
// Webhook de ingesta de pasos diarios.
// Pensado para un atajo de Apple Shortcuts (iPhone) que cada noche lee los
// pasos del día de la app Salud y los manda aquí, sin que la clienta toque
// nada. Se identifica con su token (clientas.pasos_ingest_token).
//
//   GET/POST /api/pasos/ingest?t=<token>&pasos=<n>&fecha=YYYY-MM-DD
//   (fecha opcional; por defecto, hoy en UTC)
//
// Escribe con service_role (salta RLS) tras validar el token.
// ============================================================================

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function servicio() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function ingerir(
  token: string | null,
  pasosRaw: string | number | null,
  fechaRaw: string | null
) {
  if (!token) {
    return NextResponse.json({ ok: false, error: "Falta el token." }, { status: 401 });
  }
  const pasos =
    typeof pasosRaw === "number" ? pasosRaw : parseInt(String(pasosRaw ?? ""), 10);
  if (!Number.isFinite(pasos) || pasos < 0) {
    return NextResponse.json({ ok: false, error: "Pasos inválidos." }, { status: 400 });
  }

  const sb = servicio();
  if (!sb) {
    return NextResponse.json(
      { ok: false, error: "Servidor mal configurado." },
      { status: 500 }
    );
  }

  const { data: clienta } = await sb
    .from("clientas")
    .select("id, coach_id")
    .eq("pasos_ingest_token", token)
    .maybeSingle<{ id: string; coach_id: string }>();
  if (!clienta) {
    return NextResponse.json({ ok: false, error: "Token no válido." }, { status: 401 });
  }

  const fecha =
    fechaRaw && /^\d{4}-\d{2}-\d{2}$/.test(fechaRaw)
      ? fechaRaw
      : new Date().toISOString().slice(0, 10);

  const { error } = await sb.from("pasos_diarios").upsert(
    {
      coach_id: clienta.coach_id,
      clienta_id: clienta.id,
      fecha,
      pasos,
      fuente: "apple_health",
    },
    { onConflict: "clienta_id,fecha" }
  );
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, pasos, fecha });
}

export async function GET(request: Request) {
  const u = new URL(request.url);
  return ingerir(
    u.searchParams.get("t"),
    u.searchParams.get("pasos"),
    u.searchParams.get("fecha")
  );
}

export async function POST(request: Request) {
  const u = new URL(request.url);
  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    // sin cuerpo JSON: nos quedamos con los query params
  }
  return ingerir(
    u.searchParams.get("t") ?? (body.t as string) ?? (body.token as string) ?? null,
    u.searchParams.get("pasos") ?? (body.pasos as string | number) ?? null,
    u.searchParams.get("fecha") ?? (body.fecha as string) ?? null
  );
}
