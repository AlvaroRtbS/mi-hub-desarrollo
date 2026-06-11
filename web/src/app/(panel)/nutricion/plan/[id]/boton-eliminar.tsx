"use client";

import { useState, useTransition } from "react";
import { Boton } from "@/components/ui/boton";
import { eliminarPlanNutricion } from "../../acciones";

export function BotonEliminarPlan({ id }: { id: string }) {
  const [enviando, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex flex-col items-end gap-1">
      <Boton
        variante="peligro"
        tamano="sm"
        disabled={enviando}
        onClick={() => {
          if (!confirm("¿Eliminar este plan?")) return;
          setError(null);
          startTransition(async () => {
            const r = await eliminarPlanNutricion(id);
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
