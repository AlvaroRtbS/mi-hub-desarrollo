"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Boton } from "@/components/ui/boton";
import { Campo, Input, Textarea, Select } from "@/components/ui/campo";
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

      {/* Seguimiento comercial (CRM Fase 1). Plegable para no recargar la ficha.
          Estos campos los gobierna solo el coach (la clienta no los puede tocar). */}
      <details className="border border-neutral-800 rounded-xl px-4 py-3">
        <summary className="cursor-pointer select-none text-sm font-medium text-neutral-300">
          Seguimiento comercial (CRM)
        </summary>
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Campo label="Etapa del funnel">
              <Select name="etapa" defaultValue={clienta?.etapa ?? ""}>
                <option value="">— Sin clasificar</option>
                <option value="lead">Lead</option>
                <option value="activa">Activa</option>
                <option value="pausada">Pausada</option>
                <option value="baja">Baja</option>
                <option value="recuperable">Recuperable</option>
              </Select>
            </Campo>
            <Campo label="Origen del lead">
              <Input
                name="lead_source"
                list="lead-sources"
                defaultValue={clienta?.lead_source ?? ""}
                placeholder="reel, anuncio, referido…"
              />
              <datalist id="lead-sources">
                <option value="reel" />
                <option value="anuncio" />
                <option value="referido" />
                <option value="keyword" />
              </datalist>
            </Campo>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Campo label="WhatsApp (para el botón wa.me)">
              <Input
                type="tel"
                name="whatsapp_phone"
                defaultValue={clienta?.whatsapp_phone ?? ""}
                placeholder="+34 600 000 000"
              />
            </Campo>
            <Campo label="Ciudad">
              <Input
                name="ciudad"
                defaultValue={clienta?.ciudad ?? ""}
                placeholder="Madrid"
              />
            </Campo>
          </div>

          <label className="flex items-center gap-2 text-sm text-neutral-300">
            <input
              type="checkbox"
              name="es_avatar_objetivo"
              defaultChecked={clienta?.es_avatar_objetivo ?? false}
              className="size-4 rounded border-neutral-700 bg-neutral-900 accent-[var(--brand)]"
            />
            Encaja con el avatar objetivo (Sara)
          </label>

          <Campo label="Objetivo principal">
            <Input
              name="objetivo_principal"
              defaultValue={clienta?.objetivo_principal ?? ""}
              placeholder="Perder grasa, tonificar, recomposición…"
            />
          </Campo>

          <div className="grid grid-cols-2 gap-4">
            <Campo label="Condiciones médicas">
              <Textarea
                name="condiciones_medicas"
                defaultValue={clienta?.condiciones_medicas ?? ""}
                placeholder="Hipotiroidismo, diabetes…"
              />
            </Campo>
            <Campo label="Lesiones / limitaciones">
              <Textarea
                name="lesiones_limitaciones"
                defaultValue={clienta?.lesiones_limitaciones ?? ""}
                placeholder="Hombro, rodilla…"
              />
            </Campo>
          </div>

          <Campo label="Material disponible">
            <Input
              name="material"
              defaultValue={clienta?.material ?? ""}
              placeholder="Mancuernas, bandas, gimnasio…"
            />
          </Campo>

          <Campo label="Notas internas (NO visibles para la clienta)">
            <Textarea
              name="notas_contexto"
              defaultValue={clienta?.notas_contexto ?? ""}
              placeholder="Contexto comercial, seguimiento, recordatorios…"
            />
          </Campo>
        </div>
      </details>

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
