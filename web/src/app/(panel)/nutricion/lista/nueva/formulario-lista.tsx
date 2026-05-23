"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Boton } from "@/components/ui/boton";
import { Campo, Input, Textarea, Select } from "@/components/ui/campo";
import { crearListaCompra } from "../../acciones";

type ClientaBasica = {
  id: string;
  nombre: string;
  apellidos: string | null;
};

export function FormularioLista({ clientas }: { clientas: ClientaBasica[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [enviando, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const r = await crearListaCompra(fd);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      router.push("/nutricion");
      router.refresh();
    });
  }

  if (clientas.length === 0) {
    return (
      <div className="border border-dashed border-neutral-800 rounded-2xl p-12 text-center text-sm text-neutral-500">
        No hay clientas activas para asignar la lista.
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5 max-w-2xl">
      <Campo label="Clienta">
        <Select name="clienta_id" required defaultValue={clientas[0]!.id}>
          {clientas.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre} {c.apellidos ?? ""}
            </option>
          ))}
        </Select>
      </Campo>

      <Campo label="Nombre">
        <Input name="nombre" required placeholder="Compra semana 12-18 mayo" />
      </Campo>

      <Campo
        label="Productos"
        hint="Un producto por línea. Puedes escribir cantidad si quieres (ej: '200 g pollo')."
      >
        <Textarea
          name="items"
          rows={10}
          required
          placeholder={`Pollo (500 g)\nArroz integral (1 kg)\nBrócoli\nHuevos (12)`}
        />
      </Campo>

      {error && (
        <div className="text-sm text-red-400 bg-red-950/30 border border-red-900/50 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <Boton type="submit" disabled={enviando}>
          {enviando ? "Creando..." : "Crear lista"}
        </Boton>
        <Boton variante="secundario" href="/nutricion">
          Cancelar
        </Boton>
      </div>
    </form>
  );
}
