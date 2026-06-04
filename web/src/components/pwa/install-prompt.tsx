"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "mihub_install_dismiss";

function yaInstalada() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // iOS Safari
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function esIOS() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const iOS = /iphone|ipad|ipod/i.test(ua);
  // En iPad moderno el UA es de Mac: detectamos por touch.
  const iPadOS = /macintosh/i.test(ua) && "ontouchend" in document;
  return iOS || iPadOS;
}

/**
 * Banner discreto para instalar la app.
 *  - Android / desktop: captura `beforeinstallprompt` y ofrece botón "Instalar".
 *  - iOS Safari (no dispara el evento): muestra la pista de "Compartir → Añadir a inicio".
 * Se oculta si ya está instalada o si la clienta lo descartó.
 */
export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [mostrarIOS, setMostrarIOS] = useState(false);
  const [oculto, setOculto] = useState(true);

  useEffect(() => {
    if (yaInstalada()) return;
    if (localStorage.getItem(DISMISS_KEY) === "1") return;

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setOculto(false);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);

    // iOS no dispara el evento: mostramos la pista manual.
    if (esIOS()) {
      setMostrarIOS(true);
      setOculto(false);
    }

    const onInstalled = () => setOculto(true);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (oculto) return null;

  const descartar = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setOculto(true);
  };

  const instalar = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    setOculto(true);
  };

  return (
    <div className="absolute inset-x-3 bottom-[4.75rem] z-20">
      <div className="flex items-center gap-3 rounded-2xl border border-neutral-700/70 bg-neutral-900/95 px-4 py-3 shadow-2xl backdrop-blur">
        <div
          className="flex size-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white"
          style={{ backgroundColor: "var(--brand, #16a34a)" }}
        >
          mh
        </div>
        <div className="min-w-0 flex-1">
          {mostrarIOS ? (
            <p className="text-xs leading-snug text-neutral-200">
              Instala la app: toca{" "}
              <span aria-hidden>⎙</span> <strong>Compartir</strong> y luego{" "}
              <strong>Añadir a pantalla de inicio</strong>.
            </p>
          ) : (
            <p className="text-sm font-medium text-neutral-100">
              Instala la app en tu móvil
            </p>
          )}
        </div>
        {!mostrarIOS && (
          <button
            onClick={instalar}
            className="shrink-0 rounded-lg px-3 py-1.5 text-sm font-semibold text-white"
            style={{ backgroundColor: "var(--brand, #16a34a)" }}
          >
            Instalar
          </button>
        )}
        <button
          onClick={descartar}
          aria-label="Descartar"
          className="shrink-0 rounded-lg px-2 py-1 text-neutral-400 hover:text-neutral-200"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
