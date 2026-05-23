"use client";

import { useTransition } from "react";
import { Boton } from "@/components/ui/boton";
import { eliminarListaCompra } from "../../acciones";

export function BotonEliminarLista({ id }: { id: string }) {
  const [enviando, startTransition] = useTransition();
  return (
    <Boton
      variante="peligro"
      tamano="sm"
      disabled={enviando}
      onClick={() => {
        if (!confirm("¿Eliminar esta lista?")) return;
        startTransition(async () => {
          await eliminarListaCompra(id);
        });
      }}
    >
      Eliminar
    </Boton>
  );
}
