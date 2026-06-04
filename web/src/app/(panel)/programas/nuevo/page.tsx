"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Boton } from "@/components/ui/boton";
import { Campo, Input, Textarea } from "@/components/ui/campo";
import { crearPrograma, crearDesdePlantilla } from "../acciones";
import { PLANTILLAS } from "../plantillas";

export default function NuevoProgramaPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [enviando, startTransition] = useTransition();
  const [pestaña, setPestaña] = useState<"plantillas" | "vacio">("plantillas");

  async function onSubmitVacio(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const r = await crearPrograma(formData);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      router.push(`/programas/${r.id}`);
      router.refresh();
    });
  }

  function elegirPlantilla(id: string) {
    setError(null);
    startTransition(async () => {
      const r = await crearDesdePlantilla(id);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      router.push(`/programas/${r.id}`);
      router.refresh();
    });
  }

  return (
    <div className="p-8 mx-auto max-w-4xl">
      <Link
        href="/programas"
        className="text-sm text-neutral-400 hover:text-neutral-200"
      >
        ← Volver
      </Link>

      <h1 className="text-2xl font-semibold mt-4 mb-1">Nuevo programa</h1>
      <p className="text-sm text-neutral-400 mb-6">
        Empieza desde una plantilla o crea uno vacío.
      </p>

      <div className="flex gap-1 mb-6 border-b border-neutral-800">
        <button
          onClick={() => setPestaña("plantillas")}
          className={
            "text-sm px-4 py-2 -mb-px border-b-2 " +
            (pestaña === "plantillas"
              ? "border-brand-500 text-white"
              : "border-transparent text-neutral-400 hover:text-white")
          }
        >
          Desde plantilla
        </button>
        <button
          onClick={() => setPestaña("vacio")}
          className={
            "text-sm px-4 py-2 -mb-px border-b-2 " +
            (pestaña === "vacio"
              ? "border-brand-500 text-white"
              : "border-transparent text-neutral-400 hover:text-white")
          }
        >
          Vacío
        </button>
      </div>

      {pestaña === "plantillas" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {PLANTILLAS.map((p) => (
            <button
              key={p.id}
              onClick={() => elegirPlantilla(p.id)}
              disabled={enviando}
              className="text-left border border-neutral-800 rounded-2xl p-4 hover:border-neutral-700 hover:bg-neutral-900/50 transition disabled:opacity-50"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{p.emoji}</span>
                  <div className="font-medium">{p.nombre}</div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-900 border border-neutral-800 text-neutral-400 whitespace-nowrap">
                  {p.diasPorSemana}d · {p.numSemanas} sem
                </span>
              </div>
              <p className="text-sm text-neutral-400 mt-2">{p.resumen}</p>
              <div className="flex gap-1 flex-wrap mt-3">
                {p.etiquetas.map((e) => (
                  <span
                    key={e}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-900 text-neutral-500"
                  >
                    {e}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>
      ) : (
        <form onSubmit={onSubmitVacio} className="space-y-5 max-w-2xl">
          <Campo label="Nombre">
            <Input
              name="nombre"
              required
              placeholder="Ej: Plan tonificación 8 semanas"
            />
          </Campo>

          <Campo label="Descripción (opcional)">
            <Textarea
              name="descripcion"
              placeholder="Para qué tipo de clienta es, objetivo..."
            />
          </Campo>

          <Campo
            label="Número de semanas"
            hint="Puedes añadir o quitar semanas más adelante."
          >
            <Input
              type="number"
              name="num_semanas"
              min={1}
              max={52}
              defaultValue={4}
              required
            />
          </Campo>

          <div className="flex gap-3">
            <Boton type="submit" disabled={enviando}>
              {enviando ? "Creando..." : "Crear programa vacío"}
            </Boton>
            <Boton variante="secundario" href="/programas">
              Cancelar
            </Boton>
          </div>
        </form>
      )}

      {error && (
        <div className="text-sm text-red-400 bg-red-950/30 border border-red-900/50 rounded-lg px-3 py-2 mt-4">
          {error}
        </div>
      )}
    </div>
  );
}
