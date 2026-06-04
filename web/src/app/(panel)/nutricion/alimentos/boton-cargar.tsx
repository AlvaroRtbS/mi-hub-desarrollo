"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Download } from "lucide-react";
import { cargarTablaAlimentosPorDefecto } from "../equivalencias/acciones";
import { useToast } from "@/components/ui/toast";

export function BotonCargarTabla() {
  const router = useRouter();
  const toast = useToast();
  const [cargando, start] = useTransition();

  function cargar() {
    start(async () => {
      const r = await cargarTablaAlimentosPorDefecto();
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("Tabla de alimentos cargada ✓");
      router.refresh();
    });
  }

  return (
    <button
      onClick={cargar}
      disabled={cargando}
      className="inline-flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg px-4 py-2 transition"
    >
      <Download className="size-4" />
      {cargando ? "Cargando…" : "Cargar tabla por defecto"}
    </button>
  );
}
