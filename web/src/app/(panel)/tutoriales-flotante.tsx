"use client";

import { useEffect, useState } from "react";
import { VisorManual } from "@/components/visor-manual";

type Pestana = "coach" | "clienta";

/**
 * Tutoriales como pestaña FLOTANTE: botón fijo abajo a la derecha que abre un
 * cajón lateral SIN backdrop — la página sigue siendo interactiva, para poder
 * ir haciendo los pasos mientras se lee. Vive montado en el layout del panel:
 * sobrevive a la navegación entre páginas y, al cerrar, conserva la sección y
 * el scroll (solo se oculta con translate, no se desmonta).
 */
export function TutorialesFlotante({
  manualCoach,
  manualClienta,
}: {
  manualCoach: string;
  manualClienta: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const [pestana, setPestana] = useState<Pestana>("coach");

  // Cerrar con Escape
  useEffect(() => {
    if (!abierto) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAbierto(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [abierto]);

  const tabCls = (activa: boolean) =>
    "px-3 py-1.5 rounded-lg text-xs font-medium border " +
    (activa
      ? "bg-neutral-800 border-neutral-700 text-white"
      : "border-transparent text-neutral-400 hover:text-white hover:bg-neutral-900");

  return (
    <>
      {/* Botón flotante (oculto mientras el cajón está abierto) */}
      <button
        onClick={() => setAbierto(true)}
        aria-label="Abrir tutoriales"
        className={
          "fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full border border-neutral-700 bg-neutral-900/95 backdrop-blur px-4 py-2.5 text-sm font-medium text-neutral-200 shadow-lg hover:border-neutral-500 hover:text-white transition " +
          (abierto ? "opacity-0 pointer-events-none" : "opacity-100")
        }
      >
        📖 <span className="hidden sm:inline">Tutorial</span>
      </button>

      {/* Cajón lateral: sin backdrop, la página queda usable detrás */}
      <aside
        aria-label="Tutoriales"
        className={
          "fixed top-0 right-0 z-50 h-[100dvh] w-full sm:w-[420px] bg-neutral-950 border-l border-neutral-800 shadow-2xl flex flex-col transition-transform duration-200 " +
          (abierto ? "translate-x-0" : "translate-x-full pointer-events-none")
        }
      >
        <header className="shrink-0 border-b border-neutral-800 px-4 py-3 flex items-center gap-2">
          <span className="text-lg">📖</span>
          <div className="flex gap-1 flex-1">
            <button onClick={() => setPestana("coach")} className={tabCls(pestana === "coach")}>
              🧑‍🏫 Coach
            </button>
            <button onClick={() => setPestana("clienta")} className={tabCls(pestana === "clienta")}>
              📱 Clienta
            </button>
          </div>
          <button
            onClick={() => setAbierto(false)}
            aria-label="Cerrar tutoriales"
            title="Cerrar (Esc)"
            className="size-8 rounded-lg border border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-600 flex items-center justify-center"
          >
            ✕
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4">
          {pestana === "clienta" && (
            <p className="text-xs text-neutral-500 mb-4">
              Esto es exactamente lo que ve una clienta en su apartado de ayuda
              (Mi perfil → Guía de la app).
            </p>
          )}
          {/* Ambos visores montados para conservar la sección abierta de cada manual */}
          <div className={pestana === "coach" ? "" : "hidden"}>
            <VisorManual texto={manualCoach} />
          </div>
          <div className={pestana === "clienta" ? "" : "hidden"}>
            <VisorManual texto={manualClienta} />
          </div>
        </div>
      </aside>
    </>
  );
}
