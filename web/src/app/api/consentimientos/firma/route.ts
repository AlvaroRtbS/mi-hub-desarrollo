// ============================================================================
// Webhook de firma del contrato de servicios (Google Form -> Apps Script).
// ----------------------------------------------------------------------------
// El Apps Script del formulario "Peso a Paso" hace POST aquí al enviarse una
// respuesta. Casamos la respuesta con la clienta por EMAIL y marcamos su
// consentimiento `contrato_servicios` como firmado / rechazado.
//
//   POST /api/consentimientos/firma
//   headers: { "x-contrato-secret": CONTRATO_WEBHOOK_SECRET }
//   body: { email, acepta: boolean, evidencia?: object, version?: string }
//
// Seguridad: secreto compartido en cabecera + escritura con service_role
// (solo servidor; NUNCA exponer la clave en NEXT_PUBLIC_*).
//
// Env vars necesarias en Vercel:
//   CONTRATO_WEBHOOK_SECRET     (el mismo valor que en el Apps Script)
//   SUPABASE_SERVICE_ROLE_KEY   (Project Settings -> API -> service_role)
//   NEXT_PUBLIC_SUPABASE_URL    (ya existe)
// ============================================================================

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function POST(request: Request) {
  // 1) Secreto compartido
  const secret = request.headers.get("x-contrato-secret");
  if (!secret || secret !== process.env.CONTRATO_WEBHOOK_SECRET) {
    return NextResponse.json({ ok: false, error: "no_autorizado" }, { status: 401 });
  }

  // 2) Cuerpo
  let body: {
    email?: string;
    acepta?: boolean;
    evidencia?: Record<string, unknown>;
    version?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "json_invalido" }, { status: 400 });
  }

  const email = (body.email ?? "").trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ ok: false, error: "falta_email" }, { status: 400 });
  }

  const supabase = admin();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: "config_servidor" }, { status: 500 });
  }

  // 3) Casar con la clienta por email (case-insensitive)
  const { data: clienta, error: errBusca } = await supabase
    .from("clientas")
    .select("id, coach_id")
    .ilike("email", email)
    .maybeSingle<{ id: string; coach_id: string }>();

  if (errBusca) {
    return NextResponse.json({ ok: false, error: "error_consulta" }, { status: 500 });
  }
  if (!clienta) {
    // 200 a propósito: que el Apps Script NO reintente en bucle. Queda en log
    // para revisión manual (email distinto al de la ficha).
    return NextResponse.json({ ok: true, matched: false, email });
  }

  // 4) Upsert del consentimiento (una fila por clienta+tipo)
  const ahora = new Date().toISOString();
  const estado = body.acepta ? "firmado" : "rechazado";
  const { error: errUpsert } = await supabase
    .from("consentimientos")
    .upsert(
      {
        coach_id: clienta.coach_id,
        clienta_id: clienta.id,
        tipo: "contrato_servicios",
        estado,
        metodo: "google_form",
        version: body.version ?? null,
        evidencia: body.evidencia ?? {},
        firmado_en: body.acepta ? ahora : null,
        actualizado_en: ahora,
      },
      { onConflict: "clienta_id,tipo" }
    );

  if (errUpsert) {
    return NextResponse.json({ ok: false, error: "error_guardado" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, matched: true, estado });
}
