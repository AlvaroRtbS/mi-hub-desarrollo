"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Boton } from "@/components/ui/boton";
import { Campo, Input, Textarea } from "@/components/ui/campo";
import { crearPrograma } from "../acciones";

export default function NuevoProgramaPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    const formData = new FormData(e.currentTarget);
    const r = await crearPrograma(formData);
    setEnviando(false);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    router.push(`/programas/${r.id}`);
    router.refresh();
  }

  return (
    <div className="p-8 max-w-3xl">
      <h1 className="text-2xl font-semibold mb-1">Nuevo programa</h1>
      <p className="text-sm text-neutral-400 mb-6">
        Crea una plantilla base. Luego le añades semanas, días y ejercicios.
      </p>

      <form onSubmit={onSubmit} className="space-y-5 max-w-2xl">
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
            placeholder="Para qué tipo de clienta es, objetivo, frecuencia semanal..."
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

        {error && (
          <div className="text-sm text-red-400 bg-red-950/30 border border-red-900/50 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <Boton type="submit" disabled={enviando}>
            {enviando ? "Creando..." : "Crear programa"}
          </Boton>
          <Boton variante="secundario" href="/programas">
            Cancelar
          </Boton>
        </div>
      </form>
    </div>
  );
}
