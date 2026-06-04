"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Footprints, Check, Smartphone, ChevronDown } from "lucide-react";
import { registrarPasosDiarios } from "./acciones-pasos";

type DiaPasos = { fecha: string; pasos: number; fuente: string | null };

function hoyISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function diaCorto(iso: string): string {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("es-ES", {
    weekday: "short",
    day: "2-digit",
  });
}

export function PasosDiarios({
  token,
  recientes,
}: {
  token: string | null;
  recientes: DiaPasos[];
}) {
  const router = useRouter();
  const hoy = hoyISO();
  const pasosHoy = recientes.find((r) => r.fecha === hoy)?.pasos ?? null;

  const [pasos, setPasos] = useState<string>(pasosHoy != null ? String(pasosHoy) : "");
  const [guardando, startTransition] = useTransition();
  const [guardado, setGuardado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verAtajo, setVerAtajo] = useState(false);
  const [copiado, setCopiado] = useState(false);

  const media7 = useMemo(() => {
    const ult = recientes.slice(0, 7);
    if (ult.length === 0) return null;
    return Math.round(ult.reduce((a, d) => a + d.pasos, 0) / ult.length);
  }, [recientes]);

  const maxPasos = useMemo(
    () => Math.max(1, ...recientes.slice(0, 7).map((d) => d.pasos)),
    [recientes]
  );

  const url =
    token && typeof window !== "undefined"
      ? `${window.location.origin}/api/pasos/ingest?t=${token}`
      : token
        ? `https://mi-hub-desarrollo.vercel.app/api/pasos/ingest?t=${token}`
        : null;

  function guardar() {
    setError(null);
    const num = parseInt(pasos, 10);
    if (!Number.isFinite(num) || num < 0) {
      setError("Introduce un número válido.");
      return;
    }
    startTransition(async () => {
      const r = await registrarPasosDiarios(num, hoy);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setGuardado(true);
      setTimeout(() => setGuardado(false), 2500);
      router.refresh();
    });
  }

  function copiar() {
    if (!url) return;
    navigator.clipboard.writeText(url);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <div className="border border-neutral-800 rounded-2xl p-4 bg-neutral-950 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <Footprints className="size-4" style={{ color: "var(--brand)" }} />
        <h2 className="text-sm font-medium">Pasos de hoy</h2>
        {media7 != null && (
          <span className="ml-auto text-xs text-neutral-500">
            media 7 días: <strong className="text-neutral-300">{media7.toLocaleString("es-ES")}</strong>
          </span>
        )}
      </div>

      <div className="flex gap-2">
        <input
          type="number"
          inputMode="numeric"
          min={0}
          value={pasos}
          onChange={(e) => setPasos(e.target.value)}
          placeholder="ej: 8500"
          className="flex-1 bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500"
        />
        <button
          onClick={guardar}
          disabled={guardando || pasos.trim() === ""}
          className="px-4 text-sm font-medium text-white rounded-lg disabled:opacity-50"
          style={{ backgroundColor: "var(--brand)" }}
        >
          {guardado ? <Check className="size-4" /> : guardando ? "…" : "Guardar"}
        </button>
      </div>

      {error && (
        <div className="text-xs text-red-400 mt-2 bg-red-950/30 border border-red-900/50 rounded px-2 py-1.5">
          {error}
        </div>
      )}

      {/* Mini-barras últimos 7 días */}
      {recientes.length > 0 && (
        <div className="mt-4 flex items-end justify-between gap-1 h-16">
          {recientes
            .slice(0, 7)
            .reverse()
            .map((d) => (
              <div key={d.fecha} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full rounded-t"
                  style={{
                    height: `${Math.max(4, (d.pasos / maxPasos) * 48)}px`,
                    backgroundColor: "color-mix(in srgb, var(--brand) 60%, transparent)",
                  }}
                  title={`${d.pasos.toLocaleString("es-ES")} pasos`}
                />
                <span className="text-[9px] text-neutral-600 leading-none">
                  {diaCorto(d.fecha).split(" ")[0]}
                </span>
              </div>
            ))}
        </div>
      )}

      {/* Configurar atajo automático (iPhone) */}
      {url && (
        <div className="mt-4 border-t border-neutral-900 pt-3">
          <button
            onClick={() => setVerAtajo((v) => !v)}
            className="flex items-center gap-2 text-xs text-neutral-400 hover:text-neutral-200 w-full"
          >
            <Smartphone className="size-3.5" />
            Automatizar con iPhone (Atajos)
            <ChevronDown
              className={"size-3.5 ml-auto transition " + (verAtajo ? "rotate-180" : "")}
            />
          </button>

          {verAtajo && (
            <div className="mt-3 space-y-3 text-xs text-neutral-400">
              <p>
                Con un atajo, tu iPhone sube los pasos cada noche <strong>solo</strong>,
                sin que tengas que escribir nada. Una vez configurado, te olvidas.
              </p>
              <ol className="list-decimal list-inside space-y-1.5">
                <li>Abre la app <strong>Atajos</strong> → pestaña <strong>Automatización</strong>.</li>
                <li>Crea una <strong>automatización personal</strong> → <strong>Hora del día</strong> → 23:00, todos los días.</li>
                <li>Acción <strong>“Buscar muestras de salud”</strong>: tipo <strong>Pasos</strong>, hoy, calcular <strong>Suma</strong>.</li>
                <li>Acción <strong>“Obtener contenido de URL”</strong>: método <strong>POST</strong> y pega esta dirección, añadiendo <code>&amp;pasos=</code> + la suma:</li>
              </ol>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={url}
                  onFocus={(e) => e.target.select()}
                  className="flex-1 bg-neutral-900 border border-neutral-800 rounded-lg px-2 py-1.5 text-[10px] font-mono text-neutral-300"
                />
                <button
                  onClick={copiar}
                  className="px-3 rounded-lg border border-neutral-700 text-neutral-300 hover:border-neutral-500"
                >
                  {copiado ? "✓" : "Copiar"}
                </button>
              </div>
              <p className="text-neutral-600">
                Desactiva “Preguntar antes de ejecutar” para que sea 100% automático.
                Este enlace es tuyo y privado: no lo compartas.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
