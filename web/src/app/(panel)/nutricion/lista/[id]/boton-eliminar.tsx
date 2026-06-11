"use client";

import { useState, useTransition } from "react";
import { Boton } from "@/components/ui/boton";
import { eliminarListaCompra } from "../../acciones";

export function BotonEliminarLista({ id }: { id: string }) {
  const [enviando, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex flex-col items-end gap-1">
      <Boton
        variante="peligro"
        tamano="sm"
        disabled={enviando}
        onClick={() => {
          if (!confirm("¿Eliminar esta lista?")) return;
          setError(null);
          startTransition(async () => {
            const r = await eliminarListaCompra(id);
            // En caso de éxito la acción redirige (no retorna).
            if (r && !r.ok) setError(r.error);
          });
        }}
      >
        Eliminar
      </Boton>
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  );
}
