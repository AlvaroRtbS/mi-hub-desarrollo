// ============================================================================
// WhatsApp Business webhook (stub)
// ----------------------------------------------------------------------------
// Endpoint público que Meta (WhatsApp Business API) o Twilio pueden llamar
// cuando llega un mensaje. Por ahora NO está activo: solo responde 200 a la
// verificación de Meta y registra payloads en logs.
//
// Para activarlo en el futuro:
// 1. Crear cuenta WhatsApp Business (Meta) o Twilio sandbox
// 2. Crear app en developers.facebook.com, sección WhatsApp
// 3. Configurar webhook → URL:
//      https://mi-hub-desarrollo.vercel.app/api/whatsapp/webhook
//    Verify token: el valor de WHATSAPP_VERIFY_TOKEN en Vercel
// 4. Suscribirse al evento "messages"
// 5. Añadir a Vercel las variables de entorno:
//      WHATSAPP_VERIFY_TOKEN   (token aleatorio que tú inventas)
//      WHATSAPP_APP_SECRET     (de Meta, para validar firmas HMAC)
// 6. Implementar guardado real en la tabla `mensajes` (TODO marcado abajo)
//
// IMPORTANTE: para que llegue al chat de la clienta correcta hay que mapear
// teléfonos de WhatsApp ↔ clienta_id. Para eso necesitamos:
//   - Tabla nueva: clienta_canales (telefono, clienta_id) — futuro sprint
// ============================================================================

export async function GET(request: Request) {
  // Verificación inicial de Meta: devuelve hub.challenge si el token coincide
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
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return new Response("Bad JSON", { status: 400 });
  }

  // TODO: validar firma HMAC con WHATSAPP_APP_SECRET
  // TODO: extraer messages[] del payload de Meta
  // TODO: para cada mensaje, buscar coach + clienta por teléfono y hacer:
  //   supabase.from('mensajes').insert({ coach_id, clienta_id, remitente: 'clienta',
  //                                       contenido, adjuntos: [...] })

  console.log("[whatsapp-webhook] recibido:", JSON.stringify(payload).slice(0, 500));

  return new Response("ok", { status: 200 });
}
