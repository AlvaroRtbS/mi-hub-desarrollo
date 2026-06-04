"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { guardarSuscripcionPush, borrarSuscripcionPush } from "./acciones-push";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

type Estado = "cargando" | "no-soportado" | "activadas" | "desactivadas" | "denegadas";

export function NotificacionesToggle() {
  const [estado, setEstado] = useState<Estado>("cargando");
  const [trabajando, setTrabajando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (
        typeof window === "undefined" ||
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !("Notification" in window)
      ) {
        setEstado("no-soportado");
        return;
      }
      if (Notification.permission === "denied") {
        setEstado("denegadas");
        return;
      }
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        setEstado(sub ? "activadas" : "desactivadas");
      } catch {
        setEstado("desactivadas");
      }
    })();
  }, []);

  async function activar() {
    setError(null);
    setTrabajando(true);
    try {
      const permiso = await Notification.requestPermission();
      if (permiso !== "granted") {
        setEstado(permiso === "denied" ? "denegadas" : "desactivadas");
        return;
      }
      const clave = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!clave) {
        setError("Faltan las claves de notificaciones (avisa a tu entrenador).");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(clave) as BufferSource,
      });
      const json = sub.toJSON() as { keys?: { p256dh?: string; auth?: string } };
      const r = await guardarSuscripcionPush({
        endpoint: sub.endpoint,
        p256dh: json.keys?.p256dh ?? "",
        auth: json.keys?.auth ?? "",
      });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setEstado("activadas");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo activar.");
    } finally {
      setTrabajando(false);
    }
  }

  async function desactivar() {
    setError(null);
    setTrabajando(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await borrarSuscripcionPush(sub.endpoint);
        await sub.unsubscribe();
      }
      setEstado("desactivadas");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo desactivar.");
    } finally {
      setTrabajando(false);
    }
  }

  return (
    <div className="border border-neutral-800 rounded-2xl p-4">
      <div className="flex items-start gap-3">
        <div className="text-neutral-300 mt-0.5">
          {estado === "activadas" ? <Bell className="size-5" /> : <BellOff className="size-5" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium">Notificaciones</div>
          <p className="text-xs text-neutral-400 mt-0.5">
            Recibe un aviso cuando tu entrenador te escriba o te asigne algo nuevo.
          </p>

          {estado === "no-soportado" && (
            <p className="text-xs text-neutral-500 mt-2">
              Tu navegador no admite notificaciones. En iPhone, primero instala la app
              (Compartir → Añadir a inicio) y ábrela desde el icono.
            </p>
          )}
          {estado === "denegadas" && (
            <p className="text-xs text-amber-400 mt-2">
              Has bloqueado las notificaciones. Actívalas desde los ajustes del navegador.
            </p>
          )}
          {error && <p className="text-xs text-red-400 mt-2">{error}</p>}

          {(estado === "activadas" || estado === "desactivadas") && (
            <button
              onClick={estado === "activadas" ? desactivar : activar}
              disabled={trabajando}
              className={`mt-3 inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition disabled:opacity-50 ${
                estado === "activadas"
                  ? "border border-neutral-700 text-neutral-200 hover:bg-neutral-800"
                  : "text-white"
              }`}
              style={estado === "desactivadas" ? { backgroundColor: "var(--brand)" } : undefined}
            >
              {trabajando
                ? "..."
                : estado === "activadas"
                  ? "Desactivar notificaciones"
                  : "Activar notificaciones"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
