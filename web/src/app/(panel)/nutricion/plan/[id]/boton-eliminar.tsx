"use client";

import { useTransition } from "react";
import { Boton } from "@/components/ui/boton";
import { eliminarPlanNutricion } from "../../acciones";

export function BotonEliminarPlan({ id }: { id: string }) {
  const [enviando, startTransition] = useTransition();
  return (
    <Boton
      variante="peligro"
      tamano="sm"
      disabled={enviando}
      onClick={() => {
        if (!confirm("¿Eliminar este plan?")) return;
        startTransition(async () => {
          await eliminarPlanNutricion(id);
        });
      }}
    >
      Eliminar
    </Boton>
  );
}
