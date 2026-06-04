"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { crearFormulario } from "./acciones";
import { useToast } from "@/components/ui/toast";

export function NuevoFormularioBtn() {
  const router = useRouter();
  const toast = useToast();
  const [creando, startTransition] = useTransition();

  function crear() {
    startTransition(async () => {
      const r = await crearFormulario();
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      router.push(`/formularios/${r.id}`);
    });
  }

  return (
    <button
      onClick={crear}
      disabled={creando}
      className="inline-flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg px-3 py-2 transition"
    >
      <Plus className="size-4" />
      {creando ? "Creando…" : "Nuevo formulario"}
    </button>
  );
}
