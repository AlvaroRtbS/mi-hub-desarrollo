// Envío de notificaciones push (Web Push) con las claves VAPID.
// Requiere NEXT_PUBLIC_VAPID_PUBLIC_KEY y VAPID_PRIVATE_KEY en el entorno.

import webpush from "web-push";
import type { SupabaseClient } from "@supabase/supabase-js";

let configurado = false;
function configurar(): boolean {
  if (configurado) return true;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  webpush.setVapidDetails("mailto:alvaroarisquetaalonso@gmail.com", pub, priv);
  configurado = true;
  return true;
}

type Payload = { title: string; body: string; url?: string };

/**
 * Envía una notificación push a todas las suscripciones de una clienta.
 * Best-effort: nunca lanza (no debe tumbar la acción que la dispara). Limpia
 * las suscripciones caducadas (404/410).
 */
export async function notificarClienta(
  supabase: SupabaseClient,
  clientaId: string,
  payload: Payload
): Promise<void> {
  try {
    if (!configurar()) return; // sin claves VAPID, no hacemos nada
    const { data: subs } = await supabase
      .from("push_suscripciones")
      .select("endpoint, p256dh, auth")
      .eq("clienta_id", clientaId);
    if (!subs || subs.length === 0) return;

    const cuerpo = JSON.stringify(payload);
    await Promise.all(
      subs.map(async (s) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            cuerpo
          );
        } catch (err: unknown) {
          const code = (err as { statusCode?: number })?.statusCode;
          if (code === 404 || code === 410) {
            // Suscripción muerta: la borramos.
            await supabase.from("push_suscripciones").delete().eq("endpoint", s.endpoint);
          }
        }
      })
    );
  } catch {
    // Silencioso: el push es secundario.
  }
}
