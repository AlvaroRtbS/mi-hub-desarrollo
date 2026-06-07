"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { guardarRegistroPasos } from "./acciones";
import { Camera, Check } from "lucide-react";

type Props = {
  clientaId: string;
  coachId: string;
  fecha: string;
  semana: number;
  dia: number;
  elementoId: string;
  periodo?: "dia" | "semana" | "media_semanal";
  instrucciones?: string;
  permitirCapturas?: boolean;
  /** Estado existente leído de sesiones.registros[elementoId] */
  pasosIniciales?: number | null;
  capturasIniciales?: string[];
};

function etiquetaPeriodo(p?: "dia" | "semana" | "media_semanal"): string {
  if (p === "semana") return "de la semana (total)";
  if (p === "media_semanal") return "media semanal";
  return "del día";
}

export function RegistroPasos({
  clientaId,
  coachId,
  fecha,
  semana,
  dia,
  elementoId,
  periodo,
  instrucciones,
  permitirCapturas = true,
  pasosIniciales,
  capturasIniciales = [],
}: Props) {
  const router = useRouter();
  const [pasos, setPasos] = useState<string>(
    pasosIniciales != null ? String(pasosIniciales) : ""
  );
  const [capturas, setCapturas] = useState<string[]>(capturasIniciales);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [subiendo, setSubiendo] = useState(false);
  const [guardando, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [guardado, setGuardado] = useState(false);

  // Cargar URLs firmadas de las capturas ya subidas
  useEffect(() => {
    if (capturas.length === 0) {
      setUrls({});
      return;
    }
    let cancelado = false;
    async function cargar() {
      const supabase = createSupabaseBrowserClient();
      const nuevo: Record<string, string> = {};
      for (const path of capturas) {
        const { data } = await supabase.storage
          .from("fotos-progreso")
          .createSignedUrl(path, 3600);
        if (data?.signedUrl) nuevo[path] = data.signedUrl;
      }
      if (!cancelado) setUrls(nuevo);
    }
    cargar();
    return () => {
      cancelado = true;
    };
  }, [capturas]);

  async function subirCapturas(files: FileList) {
    if (files.length === 0) return;
    setSubiendo(true);
    setError(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const nuevas: string[] = [];
      for (const archivo of Array.from(files)) {
        const ext = archivo.name.split(".").pop() ?? "jpg";
        // Ruta unificada coachId/clientaId/: la clienta escribe (seg2) y el
        // coach puede ver la captura en su panel (seg1).
        const ruta = `${coachId}/${clientaId}/pasos-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 6)}.${ext}`;
        const { error: errUp } = await supabase.storage
          .from("fotos-progreso")
          .upload(ruta, archivo, { cacheControl: "3600", upsert: false });
        if (errUp) {
          setError(errUp.message);
          continue;
        }
        nuevas.push(ruta);
      }
      setCapturas((prev) => [...prev, ...nuevas]);
    } finally {
      setSubiendo(false);
    }
  }

  function quitarCaptura(path: string) {
    setCapturas((prev) => prev.filter((p) => p !== path));
  }

  function guardar() {
    setError(null);
    const num = pasos.trim() === "" ? null : parseInt(pasos, 10);
    if (num !== null && (!Number.isFinite(num) || num < 0)) {
      setError("Pasos: introduce un número válido.");
      return;
    }
    startTransition(async () => {
      const r = await guardarRegistroPasos({
        clientaId,
        fecha,
        semana,
        dia,
        elementoId,
        pasos: num,
        capturas,
      });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setGuardado(true);
      setTimeout(() => setGuardado(false), 2500);
      router.refresh();
    });
  }

  const tieneAlgo = pasos.trim() !== "" || capturas.length > 0;

  return (
    <div className="border border-neutral-800 rounded-xl p-3 bg-neutral-900/40">
      <div className="text-sm font-medium text-neutral-100 mb-1">
        👣 Pasos {etiquetaPeriodo(periodo)}
      </div>
      {instrucciones && (
        <p className="text-xs text-neutral-400 mb-3 whitespace-pre-line">
          {instrucciones}
        </p>
      )}

      <label className="block mb-3">
        <span className="block text-[11px] text-neutral-500 mb-1">
          Número de pasos
        </span>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          value={pasos}
          onChange={(e) => setPasos(e.target.value)}
          placeholder="ej: 8500"
          className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500"
        />
      </label>

      {permitirCapturas && (
        <div className="mb-3">
          <div className="text-[11px] text-neutral-500 mb-1.5">
            Capturas{" "}
            <span className="text-neutral-600">({capturas.length})</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {capturas.map((path) => (
              <div
                key={path}
                className="relative size-16 rounded overflow-hidden bg-neutral-900 border border-neutral-800 group"
              >
                {urls[path] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={urls[path]}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full grid place-items-center text-[10px] text-neutral-600">
                    …
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => quitarCaptura(path)}
                  className="absolute top-0 right-0 size-5 grid place-items-center bg-black/80 text-white text-xs opacity-0 group-hover:opacity-100 transition"
                  aria-label="Quitar"
                >
                  ✕
                </button>
              </div>
            ))}
            <label
              className={
                "size-16 rounded border border-dashed grid place-items-center cursor-pointer transition " +
                (subiendo
                  ? "border-neutral-700 text-neutral-600"
                  : "border-neutral-700 text-neutral-400 hover:border-neutral-500")
              }
            >
              {subiendo ? (
                <span className="text-xs">…</span>
              ) : (
                <Camera className="size-5" />
              )}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="hidden"
                disabled={subiendo}
                onChange={(e) => {
                  if (e.target.files) subirCapturas(e.target.files);
                  e.target.value = "";
                }}
              />
            </label>
          </div>
        </div>
      )}

      {error && (
        <div className="text-xs text-red-400 mb-2 bg-red-950/30 border border-red-900/50 rounded px-2 py-1.5">
          {error}
        </div>
      )}

      <button
        onClick={guardar}
        disabled={guardando || !tieneAlgo}
        className="w-full text-sm font-medium text-white rounded-lg py-2 disabled:opacity-50"
        style={{ backgroundColor: "var(--brand)" }}
      >
        {guardado ? (
          <span className="inline-flex items-center gap-1.5 justify-center">
            <Check className="size-4" /> Guardado
          </span>
        ) : guardando ? (
          "Guardando…"
        ) : (
          "Guardar pasos"
        )}
      </button>
    </div>
  );
}
