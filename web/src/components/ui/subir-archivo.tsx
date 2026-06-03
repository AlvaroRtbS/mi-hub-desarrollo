"use client";

import { useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Boton } from "@/components/ui/boton";

type Bucket =
  | "ejercicios-videos"
  | "ejercicios-imagenes"
  | "fotos-progreso"
  | "nutricion-pdfs"
  | "programa-adjuntos";

// Límite de tamaño (MB) por bucket. Validación en cliente para dar feedback
// inmediato; el límite real del bucket en Supabase es la última barrera.
const LIMITES_MB: Record<Bucket, number> = {
  "ejercicios-videos": 150,
  "programa-adjuntos": 150,
  "ejercicios-imagenes": 15,
  "fotos-progreso": 15,
  "nutricion-pdfs": 25,
};

type Props = {
  bucket: Bucket;
  accept: string;
  coachId: string;
  /** Subcarpeta opcional bajo coachId/ (ej. clienta_id para fotos-progreso) */
  subcarpeta?: string;
  /** Nombre del input hidden que llevará la ruta resultante en el form */
  nombre: string;
  valorInicial?: string | null;
  /** Texto descriptivo del tipo de archivo aceptado */
  descripcion: string;
  /** Si se proporciona, se llama tras subir con la ruta resultante y el nombre original */
  onSubido?: (ruta: string, nombreArchivo: string) => void;
};

export function SubirArchivo({
  bucket,
  accept,
  coachId,
  subcarpeta,
  nombre,
  valorInicial,
  descripcion,
  onSubido,
}: Props) {
  const refInput = useRef<HTMLInputElement>(null);
  const [ruta, setRuta] = useState<string | null>(valorInicial ?? null);
  const [subiendo, setSubiendo] = useState(false);
  const [progreso, setProgreso] = useState(0);
  const [error, setError] = useState<string | null>(null);

  async function alSeleccionar(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    if (!archivo) return;

    const limiteMb = LIMITES_MB[bucket] ?? 50;
    if (archivo.size > limiteMb * 1024 * 1024) {
      setError(`El archivo supera el límite de ${limiteMb} MB.`);
      if (refInput.current) refInput.current.value = "";
      return;
    }

    setSubiendo(true);
    setError(null);
    setProgreso(0);

    const ext = archivo.name.split(".").pop() ?? "bin";
    const nombreUnico = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const ruta = [coachId, subcarpeta, nombreUnico].filter(Boolean).join("/");

    const supabase = createSupabaseBrowserClient();
    const { error: errSubida } = await supabase.storage
      .from(bucket)
      .upload(ruta, archivo, { cacheControl: "3600", upsert: false });

    setSubiendo(false);
    setProgreso(100);

    if (errSubida) {
      setError(errSubida.message);
      return;
    }

    setRuta(ruta);
    onSubido?.(ruta, archivo.name);
  }

  function quitar() {
    setRuta(null);
    if (refInput.current) refInput.current.value = "";
  }

  return (
    <div className="space-y-2">
      <input type="hidden" name={nombre} value={ruta ?? ""} />

      {ruta ? (
        <div className="flex items-center justify-between bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2">
          <div className="text-sm text-neutral-300 truncate flex-1">
            <span className="text-neutral-500">Subido:</span>{" "}
            <span className="font-mono text-xs">{ruta.split("/").pop()}</span>
          </div>
          <button
            type="button"
            onClick={quitar}
            className="text-xs text-neutral-400 hover:text-red-400"
          >
            Quitar
          </button>
        </div>
      ) : (
        <div>
          <input
            ref={refInput}
            type="file"
            accept={accept}
            onChange={alSeleccionar}
            disabled={subiendo}
            className="block text-sm text-neutral-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border file:border-neutral-700 file:bg-neutral-800 file:text-neutral-200 file:hover:bg-neutral-700 file:cursor-pointer"
          />
          <p className="text-xs text-neutral-500 mt-1">{descripcion}</p>
        </div>
      )}

      {subiendo && (
        <div className="h-1 bg-neutral-800 rounded overflow-hidden">
          <div
            className="h-full bg-brand-600 transition-all"
            style={{ width: `${progreso || 30}%` }}
          />
        </div>
      )}

      {error && <div className="text-xs text-red-400">{error}</div>}
    </div>
  );
}
