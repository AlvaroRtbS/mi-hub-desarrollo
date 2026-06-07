"use client";

import { useState } from "react";
import { Share2, X } from "lucide-react";

type Foto = { url: string; fecha: string };

function semanasEntre(a: string, b: string): number {
  const d = Math.round(
    (new Date(b + "T00:00:00Z").getTime() - new Date(a + "T00:00:00Z").getTime()) /
      (7 * 86400000)
  );
  return Math.max(0, d);
}

/**
 * #12 — Antes/después compartible. Tarjeta cuadrada con la marca del coach
 * (logo + color), foto antes/ahora y los titulares del progreso. Pensada para
 * que la clienta haga captura y la comparta (orgullo + marketing orgánico).
 * Botón nativo de compartir (Web Share) cuando el dispositivo lo soporta.
 */
export function CompartirProgreso({
  pesoDelta,
  pesoUnidad,
  entrenos,
  fotoAntes,
  fotoAhora,
  marcaNombre,
  logoUrl,
}: {
  pesoDelta: number | null;
  pesoUnidad: string;
  entrenos: number;
  fotoAntes: Foto | null;
  fotoAhora: Foto | null;
  marcaNombre: string;
  logoUrl: string | null;
}) {
  const [abierto, setAbierto] = useState(false);

  const bajoPeso = pesoDelta !== null && pesoDelta < 0;
  const hayFotos = !!(fotoAntes && fotoAhora && fotoAntes.url !== fotoAhora.url);
  const semanas = hayFotos ? semanasEntre(fotoAntes!.fecha, fotoAhora!.fecha) : 0;

  async function compartir() {
    const texto = bajoPeso
      ? `¡${Math.abs(pesoDelta!).toFixed(1)} ${pesoUnidad} menos${semanas ? ` en ${semanas} semanas` : ""} con ${marcaNombre}! 💪`
      : `Mi progreso con ${marcaNombre} 💪`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Mi progreso", text: texto });
      }
    } catch {
      // el usuario canceló el diálogo de compartir; no hacemos nada
    }
  }

  return (
    <>
      <button
        onClick={() => setAbierto(true)}
        className="w-full mt-3 text-sm font-medium text-white rounded-lg py-2 inline-flex items-center justify-center gap-2"
        style={{ backgroundColor: "var(--brand)" }}
      >
        <Share2 className="size-4" /> Compartir mi progreso
      </button>

      {abierto && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setAbierto(false)}
        >
          <div className="w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            {/* Tarjeta compartible (captura esto) */}
            <div
              className="rounded-2xl overflow-hidden border"
              style={{
                borderColor: "color-mix(in srgb, var(--brand) 40%, transparent)",
                background:
                  "radial-gradient(120% 90% at 50% 0%, color-mix(in srgb, var(--brand) 28%, transparent) 0%, #0a0a0a 60%)",
              }}
            >
              {/* Cabecera de marca */}
              <div className="flex items-center gap-2 px-4 pt-4">
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logoUrl}
                    alt={marcaNombre}
                    className="size-7 rounded-full object-cover bg-white"
                  />
                ) : null}
                <span
                  className="text-sm font-semibold uppercase tracking-wide"
                  style={{ color: "var(--brand)" }}
                >
                  {marcaNombre}
                </span>
              </div>

              {/* Titular */}
              <div className="px-4 pt-3 text-center">
                {pesoDelta !== null ? (
                  <>
                    <div className="text-4xl font-bold text-neutral-100">
                      {pesoDelta > 0 ? "+" : "−"}
                      {Math.abs(pesoDelta).toFixed(1)} {pesoUnidad}
                    </div>
                    <div className="text-xs text-neutral-400 mt-0.5">
                      {bajoPeso ? "menos" : "de cambio"}
                      {semanas ? ` en ${semanas} semanas` : ""}
                    </div>
                  </>
                ) : (
                  <div className="text-2xl font-bold text-neutral-100">Mi progreso</div>
                )}
              </div>

              {/* Fotos antes / ahora */}
              {hayFotos && (
                <div className="grid grid-cols-2 gap-2 p-4">
                  <figure>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={fotoAntes!.url}
                      alt="Antes"
                      className="w-full aspect-[3/4] object-cover rounded-lg"
                    />
                    <figcaption className="text-[10px] text-neutral-400 mt-1 text-center">
                      Antes
                    </figcaption>
                  </figure>
                  <figure>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={fotoAhora!.url}
                      alt="Ahora"
                      className="w-full aspect-[3/4] object-cover rounded-lg"
                    />
                    <figcaption className="text-[10px] text-neutral-400 mt-1 text-center">
                      Ahora
                    </figcaption>
                  </figure>
                </div>
              )}

              {/* Pie */}
              {entrenos > 0 && (
                <div className="px-4 pb-4 text-center text-xs text-neutral-400">
                  <strong className="text-neutral-200">{entrenos}</strong>{" "}
                  {entrenos === 1 ? "entreno completado" : "entrenos completados"} 💪
                </div>
              )}
            </div>

            {/* Acciones (fuera de la tarjeta, no salen en la captura) */}
            <div className="mt-3 flex flex-col gap-2">
              <p className="text-center text-xs text-neutral-400">
                Haz una captura para compartirla en tus historias 💜
              </p>
              <div className="flex gap-2">
                <button
                  onClick={compartir}
                  className="flex-1 text-sm font-medium text-white rounded-lg py-2 inline-flex items-center justify-center gap-2"
                  style={{ backgroundColor: "var(--brand)" }}
                >
                  <Share2 className="size-4" /> Compartir
                </button>
                <button
                  onClick={() => setAbierto(false)}
                  className="px-4 rounded-lg border border-neutral-700 text-neutral-300 inline-flex items-center"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
