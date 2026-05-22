"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Boton } from "@/components/ui/boton";
import { Campo, Input, Textarea } from "@/components/ui/campo";
import type { ResultadoAccion } from "./acciones";
import type { Clienta } from "@/lib/supabase/tipos";

type Props = {
  clienta?: Clienta;
  accion: (formData: FormData) => Promise<ResultadoAccion>;
  textoBoton: string;
  redirigirA?: string;
};

export function FormularioClienta({ clienta, accion, textoBoton, redirigirA }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setEnviando(true);

    const formData = new FormData(e.currentTarget);
    const resultado = await accion(formData);

    setEnviando(false);

    if (!resultado.ok) {
      setError(resultado.error);
      return;
    }

    if (redirigirA) {
      router.push(redirigirA);
    } else if (resultado.id) {
      router.push(`/clientas/${resultado.id}`);
    } else {
      router.push("/clientas");
    }
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5 max-w-2xl">
      <div className="grid grid-cols-2 gap-4">
        <Campo label="Nombre">
          <Input
            name="nombre"
            required
            defaultValue={clienta?.nombre ?? ""}
            placeholder="Ana"
          />
        </Campo>
        <Campo label="Apellidos">
          <Input
            name="apellidos"
            defaultValue={clienta?.apellidos ?? ""}
            placeholder="García"
          />
        </Campo>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Campo label="Email">
          <Input
            type="email"
            name="email"
            required
            defaultValue={clienta?.email ?? ""}
            placeholder="ana@ejemplo.com"
          />
        </Campo>
        <Campo label="Teléfono">
          <Input
            type="tel"
            name="telefono"
            defaultValue={clienta?.telefono ?? ""}
            placeholder="+34 600 000 000"
          />
        </Campo>
      </div>

      {clienta && (
        <>
          <Campo label="Fecha de nacimiento">
            <Input
              type="date"
              name="fecha_nacimiento"
              defaultValue={clienta?.fecha_nacimiento ?? ""}
            />
          </Campo>
          <Campo label="Notas (visibles para la clienta)">
            <Textarea
              name="notas_publicas"
              defaultValue={clienta?.notas_publicas ?? ""}
              placeholder="Objetivos, lesiones, preferencias..."
            />
          </Campo>
        </>
      )}

      {error && (
        <div className="text-sm text-red-400 bg-red-950/30 border border-red-900/50 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <Boton type="submit" disabled={enviando}>
          {enviando ? "Guardando..." : textoBoton}
        </Boton>
        <Boton variante="secundario" href="/clientas">
          Cancelar
        </Boton>
      </div>
    </form>
  );
}
