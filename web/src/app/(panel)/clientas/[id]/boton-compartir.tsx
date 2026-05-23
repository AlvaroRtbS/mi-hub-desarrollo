"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Boton } from "@/components/ui/boton";
import { crearTokenCompartir, revocarTokenCompartir } from "./acciones-share";

export function BotonCompartirPrograma({
  asignacionId,
  clientaId,
  clientaNombre,
  tokenExistente,
}: {
  asignacionId: string;
  clientaId: string;
  clientaNombre: string;
  tokenExistente: string | null;
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [token, setToken] = useState<string | null>(tokenExistente);
  const [copiado, setCopiado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviando, startTransition] = useTransition();

  function generar() {
    setError(null);
    startTransition(async () => {
      const r = await crearTokenCompartir(asignacionId, clientaId);
      if (!r.ok) setError(r.error);
      else {
        setToken(r.token);
        setAbierto(true);
        router.refresh();
      }
    });
  }

  function revocar() {
    if (!confirm("¿Revocar el link? La clienta dejará de poder verlo.")) return;
    startTransition(async () => {
      const r = await revocarTokenCompartir(asignacionId, clientaId);
      if (r.ok) {
        setToken(null);
        setAbierto(false);
        router.refresh();
      }
    });
  }

  const url =
    typeof window !== "undefined" && token
      ? `${window.location.origin}/p/${token}`
      : token
      ? `https://mi-hub-desarrollo.vercel.app/p/${token}`
      : null;

  function copiar() {
    if (!url) return;
    navigator.clipboard.writeText(url);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  function compartirWhatsApp() {
    if (!url) return;
    const msg = encodeURIComponent(
      `Hola ${clientaNombre}, aquí tienes tu programa de entrenamiento:\n${url}`
    );
    window.open(`https://wa.me/?text=${msg}`, "_blank");
  }

  return (
    <>
      {!token ? (
        <button
          onClick={generar}
          disabled={enviando}
          className="text-xs text-brand-500 hover:text-brand-400"
        >
          🔗 Generar link compartible
        </button>
      ) : (
        <button
          onClick={() => setAbierto(true)}
          className="text-xs text-brand-500 hover:text-brand-400"
        >
          🔗 Link compartible activo
        </button>
      )}

      {abierto && token && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
          onClick={() => setAbierto(false)}
        >
          <div
            className="bg-neutral-950 border border-neutral-800 rounded-2xl w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-neutral-800 flex items-center justify-between">
              <h3 className="font-semibold">Link compartible</h3>
              <button
                onClick={() => setAbierto(false)}
                className="text-neutral-500 hover:text-white text-lg"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-3">
              <p className="text-sm text-neutral-400">
                Manda este link a {clientaNombre}. Lo abre en el móvil sin
                instalar nada y ve su programa entero.
              </p>

              <div className="flex gap-2">
                <input
                  readOnly
                  value={url ?? ""}
                  className="flex-1 bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-xs font-mono text-neutral-200 focus:outline-none focus:border-brand-500"
                  onFocus={(e) => e.target.select()}
                />
                <Boton tamano="sm" variante="secundario" onClick={copiar}>
                  {copiado ? "✓" : "Copiar"}
                </Boton>
              </div>

              <Boton
                tamano="sm"
                onClick={compartirWhatsApp}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                Compartir por WhatsApp
              </Boton>

              <div className="text-xs text-neutral-500">
                Cualquiera con este link puede ver el programa (sin login). No
                lo publiques en sitios públicos.
              </div>

              {error && (
                <div className="text-sm text-red-400 bg-red-950/30 border border-red-900/50 rounded-lg px-3 py-2">
                  {error}
                </div>
              )}
            </div>

            <div className="px-5 py-3 border-t border-neutral-800 flex justify-end">
              <button
                onClick={revocar}
                disabled={enviando}
                className="text-xs text-neutral-500 hover:text-red-400"
              >
                Revocar link
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
