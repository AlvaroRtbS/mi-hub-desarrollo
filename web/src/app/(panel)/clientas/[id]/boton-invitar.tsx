"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Boton } from "@/components/ui/boton";
import { generarInvitacion, revocarInvitacion } from "./acciones-invitacion";

export function BotonInvitar({
  clientaId,
  clientaNombre,
  yaEnlazada,
  tokenExistente,
}: {
  clientaId: string;
  clientaNombre: string;
  yaEnlazada: boolean;
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
      const r = await generarInvitacion(clientaId);
      if (!r.ok) setError(r.error);
      else {
        setToken(r.token);
        setAbierto(true);
        router.refresh();
      }
    });
  }

  function revocar() {
    if (
      !confirm(
        "¿Revocar el link de invitación? Si la clienta no ha creado cuenta todavía, no podrá hacerlo con este link."
      )
    )
      return;
    startTransition(async () => {
      const r = await revocarInvitacion(clientaId);
      if (r.ok) {
        setToken(null);
        setAbierto(false);
        router.refresh();
      }
    });
  }

  const url =
    typeof window !== "undefined" && token
      ? `${window.location.origin}/i/${token}`
      : token
      ? `https://mi-hub-desarrollo.vercel.app/i/${token}`
      : null;

  function copiar() {
    if (!url) return;
    navigator.clipboard.writeText(url);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  function compartirWhatsApp() {
    if (!url) return;
    const nombre = clientaNombre.split(" ")[0] ?? clientaNombre;
    const msg = encodeURIComponent(
      `Hola ${nombre}! Te invito a la app donde llevaremos tu entreno. Crea tu cuenta aquí (es rápido):\n${url}`
    );
    window.open(`https://wa.me/?text=${msg}`, "_blank");
  }

  if (yaEnlazada) {
    return (
      <button
        disabled
        className="text-xs text-neutral-500 cursor-not-allowed"
        title="Esta clienta ya tiene acceso a la app"
      >
        ✓ Ya tiene acceso
      </button>
    );
  }

  return (
    <>
      {!token ? (
        <button
          onClick={generar}
          disabled={enviando}
          className="text-xs text-brand-500 hover:text-brand-400 disabled:opacity-50"
        >
          📩 Invitar a la app
        </button>
      ) : (
        <button
          onClick={() => setAbierto(true)}
          className="text-xs text-brand-500 hover:text-brand-400"
        >
          📩 Invitación activa
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
              <h3 className="font-semibold">Invitar a {clientaNombre}</h3>
              <button
                onClick={() => setAbierto(false)}
                className="text-neutral-500 hover:text-white text-lg leading-none"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-3">
              <p className="text-sm text-neutral-400">
                Mándale este link. Lo abre, crea su contraseña y ya puede entrar a
                ver su programa, marcar entrenos y subir progreso.
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
                El link es válido 30 días. Una vez la clienta cree su cuenta, queda
                inutilizado automáticamente.
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
                Revocar invitación
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
