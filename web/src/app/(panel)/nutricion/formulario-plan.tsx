"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Boton } from "@/components/ui/boton";
import { Campo, Input, Textarea, Select } from "@/components/ui/campo";
import { SubirArchivo } from "@/components/ui/subir-archivo";
import { crearPlanNutricion } from "./acciones";

type ClientaBasica = {
  id: string;
  nombre: string;
  apellidos: string | null;
};

export function FormularioPlan({
  coachId,
  clientas,
}: {
  coachId: string;
  clientas: ClientaBasica[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [enviando, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const r = await crearPlanNutricion(fd);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      router.push("/nutricion");
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5 max-w-2xl">
      <Campo label="Nombre del plan">
        <Input name="nombre" required placeholder="Ej: Plan tonificación 1500 kcal" />
      </Campo>

      <Campo label="Asignar a (opcional)">
        <Select name="clienta_id" defaultValue="">
          <option value="">— Plantilla (sin asignar) —</option>
          {clientas.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre} {c.apellidos ?? ""}
            </option>
          ))}
        </Select>
      </Campo>

      <Campo label="Descripción (opcional)">
        <Input
          name="descripcion"
          placeholder="Objetivo, kcal, macros..."
        />
      </Campo>

      <Campo label="PDF del plan (opcional)" hint="PDF hasta 20 MB.">
        <SubirArchivo
          bucket="nutricion-pdfs"
          accept="application/pdf"
          coachId={coachId}
          nombre="pdf_url"
          descripcion="Se subirá a tu almacenamiento privado."
        />
      </Campo>

      <Campo
        label="Contenido en texto (opcional)"
        hint="Útil para ver el plan rápido sin descargar el PDF."
      >
        <Textarea
          name="contenido_markdown"
          rows={8}
          placeholder={`# Desayuno\n- 2 huevos\n- 60 g avena\n...`}
        />
      </Campo>

      {error && (
        <div className="text-sm text-red-400 bg-red-950/30 border border-red-900/50 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <Boton type="submit" disabled={enviando}>
          {enviando ? "Guardando..." : "Crear plan"}
        </Boton>
        <Boton variante="secundario" href="/nutricion">
          Cancelar
        </Boton>
      </div>
    </form>
  );
}
