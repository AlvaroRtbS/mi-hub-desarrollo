// ============================================================================
// Puente WhatsApp → chat de mi-hub (Opción 2).
// ----------------------------------------------------------------------------
// El bot local de WhatsApp de Álvaro hace POST aquí por cada mensaje, y lo
// insertamos en la tabla `mensajes` → aparece en el chat de la clienta (y en
// el panel del coach). Así el hilo de WhatsApp queda reflejado en la app.
//
// Autenticación: secreto compartido (WHATSAPP_BRIDGE_SECRET en Vercel), que el
// bot envía en `?secret=` o en la cabecera `x-bridge-secret`. (No usamos la
// API oficial de Meta; el GET de verificación se mantiene por si algún día.)
//
// Payload esperado del bot (JSON):
//   { "telefono": "+34600111222", "mensaje": "texto", "desde": "clienta" }
//   desde: "clienta" (default) | "coach"
//
// Mapea el teléfono → clienta por los últimos 9 dígitos (tolera prefijos),
// comparando contra clientas.whatsapp_phone o clientas.telefono.
// ============================================================================

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function soloDigitos(s: string | null | undefined): string {
  return (s ?? "").replace(/\D/g, "");
}

// GET: verificación de Meta (por si en el futuro se usa la API oficial).
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
  if (mode === "subscribe" && token && token === verifyToken) {
    return new Response(challenge ?? "", { status: 200 });
  }
  return new Response("Forbidden", { status: 403 });
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const secret = process.env.WHATSAPP_BRIDGE_SECRET;
  if (!secret) {
    return NextResponse.json(
      { ok: false, error: "Puente no configurado (falta WHATSAPP_BRIDGE_SECRET)." },
      { status: 503 }
    );
  }
  const enviado =
    url.searchParams.get("secret") ?? request.headers.get("x-bridge-secret");
  if (enviado !== secret) {
    return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
  }

  let body: { telefono?: string; mensaje?: string; desde?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido." }, { status: 400 });
  }

  const digitos = soloDigitos(body.telefono);
  const mensaje = (body.mensaje ?? "").trim();
  const remitente = body.desde === "coach" ? "coach" : "clienta";
  if (digitos.length < 6 || !mensaje) {
    return NextResponse.json(
      { ok: false, error: "Faltan telefono o mensaje." },
      { status: 400 }
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json(
      { ok: false, error: "Servidor mal configurado." },
      { status: 500 }
    );
  }
  const sb = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Mapear teléfono → clienta por los últimos 9 dígitos.
  const cola = digitos.slice(-9);
  const { data: clientas } = await sb
    .from("clientas")
    .select("id, coach_id, whatsapp_phone, telefono");
  const clienta = (clientas ?? []).find((c) => {
    const w = soloDigitos(c.whatsapp_phone).slice(-9);
    const t = soloDigitos(c.telefono).slice(-9);
    return (w && w === cola) || (t && t === cola);
  });
  if (!clienta) {
    // 200 para que el bot no reintente en bucle; avisamos que no encajó.
    return NextResponse.json({ ok: false, error: "Teléfono sin clienta." });
  }

  const { error } = await sb.from("mensajes").insert({
    coach_id: clienta.coach_id,
    clienta_id: clienta.id,
    remitente,
    contenido: mensaje,
    leido: remitente === "coach", // los del coach ya los "ha visto" él
  });
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, clienta_id: clienta.id });
}
