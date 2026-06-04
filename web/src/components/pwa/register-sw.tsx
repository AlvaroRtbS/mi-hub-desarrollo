"use client";

import { useEffect } from "react";

/**
 * Registra el service worker de la PWA. Solo en producción para no interferir
 * con el HMR del servidor de desarrollo. No renderiza nada.
 */
export function RegisterSW() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }
    const onLoad = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Silencioso: si falla el registro, la app sigue funcionando online.
      });
    };
    window.addEventListener("load", onLoad);
    return () => window.removeEventListener("load", onLoad);
  }, []);

  return null;
}
