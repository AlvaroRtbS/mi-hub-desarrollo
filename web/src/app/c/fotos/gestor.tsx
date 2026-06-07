"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SubirArchivo } from "@/components/ui/subir-archivo";
import { formatearFecha } from "@/lib/utilidades";
import { registrarMiFoto, eliminarMiFoto } from "./acciones";
import { Confetti } from "@/components/confetti";
import { useToast } from "@/components/ui/toast";
import { EmptyState } from "@/components/ui/empty-state";

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
  coachId,
  comparadorActivo,
  fotos,
}: {
  clientaId: string;
  coachId: string;
  comparadorActivo: boolean;
  fotos: FotoCliente[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [agregando, setAgregando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [celebrar, setCelebrar] = useState(false);
  const [enviando, startTransition] = useTransition();
  const [verFoto, setVerFoto] = useState<FotoCliente | null>(null);

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
      setCelebrar(true);
      setTimeout(() => setCelebrar(false), 3500);
      toast.success("Foto subida ✓");
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
      <Confetti trigger={celebrar} cantidad={40} duracion={2000} />
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
              coachId={coachId}
              subcarpeta={clientaId}
              nombre="url"
              descripcion="Solo tú y tu entrenador la veis."
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
          Tu entrenador prefiere no usar comparador antes/después contigo. Tus
          fotos se le muestran solo como galería.
        </div>
      )}

      {fotos.length === 0 ? (
        <EmptyState
          icono="📸"
          titulo="Aún no has subido ninguna foto"
          descripcion="Sube tu primera foto de progreso con el botón de arriba."
        />
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {fotos.map((f) => (
            <div
              key={f.id}
              className="border border-neutral-800 rounded-xl overflow-hidden bg-neutral-950"
            >
              <button
                type="button"
                onClick={() => f.urlFirmada && setVerFoto(f)}
                disabled={!f.urlFirmada}
                className="aspect-[3/4] bg-neutral-900 block w-full"
                aria-label="Ver foto a pantalla completa"
              >
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
              </button>
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

      {verFoto?.urlFirmada && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4"
          onClick={() => setVerFoto(null)}
        >
          <button
            onClick={() => setVerFoto(null)}
            className="absolute top-4 right-4 text-white/80 hover:text-white text-2xl leading-none"
            aria-label="Cerrar"
          >
            ✕
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={verFoto.urlFirmada}
            alt=""
            className="max-w-full max-h-[85vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
          <div className="text-xs text-neutral-400 mt-3">
            {formatearFecha(verFoto.fecha)}
            {verFoto.tipo && <span className="capitalize"> · {verFoto.tipo}</span>}
          </div>
        </div>
      )}
    </div>
  );
}
