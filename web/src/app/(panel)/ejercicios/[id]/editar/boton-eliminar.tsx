"use client";

import { useTransition } from "react";
import { Boton } from "@/components/ui/boton";
import { eliminarEjercicio } from "../../acciones";

export function BotonEliminar({ ejercicioId }: { ejercicioId: string }) {
  const [transicion, iniciarTransicion] = useTransition();

  function eliminar() {
    if (!confirm("¿Eliminar este ejercicio definitivamente?")) return;
    iniciarTransicion(async () => {
      await eliminarEjercicio(ejercicioId);
    });
  }

  return (
    <Boton variante="peligro" disabled={transicion} onClick={eliminar}>
      Eliminar
    </Boton>
  );
}
