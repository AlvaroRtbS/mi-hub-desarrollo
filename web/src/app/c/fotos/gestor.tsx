"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SubirArchivo } from "@/components/ui/subir-archivo";
import { formatearFecha } from "@/lib/utilidades";
import { registrarMiFoto, eliminarMiFoto } from "./acciones";

type FotoCliente = {
  id: string;
  url: string;
  tipo: string | null;
  fecha: string;
  notas: string | null;
  subida_en: string;
  urlFirmada: string | null;
};

const TIPOS = [
  { id: "frontal", label: "Frontal" },
  { id: "lateral", label: "Lateral" },
  { id: "trasera", label: "Trasera" },
  { id: "otra", label: "Otra" },
];

export function GestorMisFotos({
  clientaId,
  comparadorActivo,
  fotos,
}: {
  clientaId: string;
  comparadorActivo: boolean;
  fotos: FotoCliente[];
}) {
  const router = useRouter();
  const [agregando, setAgregando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviando, startTransition] = useTransition();

  function guardar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const url = String(fd.get("url") ?? "").trim();
    const tipo = String(fd.get("tipo") ?? "").trim() || null;
    const fecha = String(fd.get("fecha") ?? "").trim();

    if (!url) {
      setError("Espera a que la imagen termine de subir antes de guardar.");
      return;
    }
    if (!fecha) {
      setError("Pon una fecha.");
      return;
    }

    startTransition(async () => {
      const r = await registrarMiFoto(url, tipo, fecha, null);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setAgregando(false);
      router.refresh();
    });
  }

  function quitar(id: string) {
    if (!confirm("¿Eliminar esta foto?")) return;
    startTransition(async () => {
      await eliminarMiFoto(id);
      router.refresh();
    });
  }

  return (
    <div>
      {agregando ? (
        <form
          onSubmit={guardar}
          className="border border-neutral-800 rounded-2xl p-4 space-y-3 bg-neutral-900/50 mb-4"
        >
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">Subir foto</div>
            <button
              type="button"
              onClick={() => setAgregando(false)}
              className="text-neutral-500 hover:text-white text-lg"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-neutral-500 mb-1">Tipo</label>
              <select
                name="tipo"
                defaultValue="frontal"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500"
              >
                {TIPOS.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-neutral-500 mb-1">Fecha</label>
              <input
                type="date"
                name="fecha"
                defaultValue={new Date().toISOString().slice(0, 10)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-neutral-500 mb-1">Imagen</label>
            <SubirArchivo
              bucket="fotos-progreso"
              accept="image/jpeg,image/png,image/webp"
              coachId={clientaId}
              nombre="url"
              descripcion="Solo tú y tu entrenadora la veis."
            />
          </div>

          {error && (
            <div className="text-sm text-red-400 bg-red-950/30 border border-red-900/50 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={enviando}
            className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white rounded-lg py-2.5 text-sm font-medium"
          >
            {enviando ? "Guardando..." : "Guardar foto"}
          </button>
        </form>
      ) : (
        <button
          onClick={() => setAgregando(true)}
          className="w-full border border-dashed border-brand-900/50 bg-brand-950/10 text-brand-400 rounded-xl py-3 text-sm font-medium hover:bg-brand-950/30 mb-4"
        >
          📸 Subir foto de progreso
        </button>
      )}

      {!comparadorActivo && fotos.length > 0 && (
        <div className="text-[10px] text-neutral-600 bg-neutral-900/50 border border-neutral-800 rounded-lg px-3 py-2 mb-3">
          Tu entrenadora prefiere no usar comparador antes/después contigo. Tus
          fotos se le muestran solo como galería.
        </div>
      )}

      {fotos.length === 0 ? (
        <div className="border border-dashed border-neutral-800 rounded-2xl p-8 text-center text-sm text-neutral-500">
          Aún no has subido ninguna foto.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {fotos.map((f) => (
            <div
              key={f.id}
              className="border border-neutral-800 rounded-xl overflow-hidden bg-neutral-950"
            >
              <div className="aspect-[3/4] bg-neutral-900">
                {f.urlFirmada ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={f.urlFirmada}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-neutral-700">
                    Sin imagen
                  </div>
                )}
              </div>
              <div className="p-2 text-xs">
                <div className="text-neutral-300">
                  {formatearFecha(f.fecha)}
                  {f.tipo && (
                    <span className="text-neutral-500 capitalize ml-1">
                      · {f.tipo}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => quitar(f.id)}
                  className="text-[10px] text-neutral-500 hover:text-red-400 mt-1"
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
