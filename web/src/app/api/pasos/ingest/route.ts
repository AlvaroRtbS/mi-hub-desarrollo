// ============================================================================
// Webhook de ingesta de pasos diarios.
// Pensado para un atajo de Apple Shortcuts (iPhone) que cada noche lee los
// pasos del día de la app Salud y los manda aquí, sin que la clienta toque
// nada. Se identifica con su token (clientas.pasos_ingest_token).
//
//   GET/POST /api/pasos/ingest?t=<token>&pasos=<n>&fecha=YYYY-MM-DD
//   (fecha opcional; por defecto, hoy en UTC)
//
// Escribe vía la RPC `ingerir_pasos` (SECURITY DEFINER, validada por token),
// con la clave anon pública. No necesita la service_role key.
// ============================================================================

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { hoyISO } from "@/lib/utilidades";

function cliente() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

const ESTADO: Record<string, number> = {
  sin_token: 401,
  token_no_valido: 401,
  pasos_invalidos: 400,
};

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

  const sb = cliente();
  if (!sb) {
    return NextResponse.json(
      { ok: false, error: "Servidor mal configurado." },
      { status: 500 }
    );
  }

  const fecha =
    fechaRaw && /^\d{4}-\d{2}-\d{2}$/.test(fechaRaw) ? fechaRaw : null;

  const { data, error } = await sb.rpc("ingerir_pasos", {
    t: token,
    p: pasos,
    f: fecha,
  });
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const r = (Array.isArray(data) ? data[0] : data) as
    | { ok: boolean; error: string | null }
    | undefined;
  if (!r?.ok) {
    const motivo = r?.error ?? "desconocido";
    return NextResponse.json(
      { ok: false, error: motivo },
      { status: ESTADO[motivo] ?? 400 }
    );
  }

  return NextResponse.json({
    ok: true,
    pasos,
    fecha: fecha ?? hoyISO(),
  });
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
